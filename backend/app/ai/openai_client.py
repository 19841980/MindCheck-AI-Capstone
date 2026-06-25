"""
MindCheck — OpenAI Client Wrapper.

Isolated wrapper for the OpenAI API. Allows changing the model
or provider by editing only this module, without modifying
business logic.

Error handling follows the protocol in buenas-practicas.md §4.3:
- RateLimitError: Retry with exponential backoff (max 3 attempts).
- APITimeoutError: Circuit breaker, fail fast.
- InvalidResponseError: Retry with enriched prompt (max 2 attempts).
- AuthenticationError: No retry, critical alert.
- ServiceUnavailableError: Circuit breaker.
"""

import json
import logging
from typing import Any

from openai import AsyncOpenAI, RateLimitError, APITimeoutError, AuthenticationError, APIError
import asyncio

from app.core.config import get_settings
from app.ai.prompts.sentiment_prompts import SENTIMENT_ANALYSIS_PROMPT_V2
from app.schemas.journal import SentimentAnalysisResponse

logger = logging.getLogger("mindcheck.ai")

# Current prompt version in use
ACTIVE_PROMPT = SENTIMENT_ANALYSIS_PROMPT_V2


class OpenAIClient:
    """
    Wrapper for OpenAI GPT-4o mini API.
    
    Provides sentiment analysis with structured JSON output,
    automatic retries, and error handling per protocol.
    """

    def __init__(self):
        settings = get_settings()
        self._client = AsyncOpenAI(api_key=settings.openai_api_key)
        self._model = "gpt-4o-mini"
        self._max_tokens = 800  # Cost control per §6.1
        self._timeout = 10  # Seconds

    async def analyze_emotional_sentiment(
        self, journal_text: str
    ) -> SentimentAnalysisResponse:
        """
        Analyze emotional sentiment of a journal entry text.
        
        Returns a validated SentimentAnalysisResponse.
        Raises ValueError if analysis fails after all retries.
        """
        prompt_text = ACTIVE_PROMPT + journal_text

        # Attempt with retries
        last_error = None
        for attempt in range(3):
            try:
                response = await asyncio.wait_for(
                    self._call_openai(prompt_text),
                    timeout=self._timeout,
                )
                # Parse and validate JSON response
                return self._parse_response(response)

            except RateLimitError as e:
                # Exponential backoff: 1s, 2s, 4s
                wait_time = 2 ** attempt
                logger.warning(
                    "OpenAI rate limited. Retry %d in %ds.",
                    attempt + 1, wait_time,
                    extra={"attempt": attempt + 1},
                )
                last_error = e
                await asyncio.sleep(wait_time)

            except asyncio.TimeoutError:
                logger.error("OpenAI timeout after %ds.", self._timeout)
                raise ValueError(
                    "El servicio de análisis no respondió a tiempo. "
                    "Tu entrada fue guardada y se analizará pronto."
                )

            except AuthenticationError:
                logger.critical("OpenAI authentication failed. Check API key.")
                raise ValueError(
                    "Error de configuración del servicio de IA. "
                    "El equipo técnico ha sido notificado."
                )

            except (json.JSONDecodeError, ValueError) as e:
                # Invalid JSON response — retry with enriched prompt
                if attempt < 2:
                    logger.warning(
                        "Invalid JSON from OpenAI. Retrying with enriched prompt.",
                        extra={"attempt": attempt + 1},
                    )
                    prompt_text = (
                        "IMPORTANTE: Responde SOLO con JSON válido, sin texto adicional.\n\n"
                        + prompt_text
                    )
                    last_error = e
                else:
                    raise ValueError(
                        "No pudimos interpretar el análisis de IA. "
                        "Por favor selecciona tu emoción manualmente."
                    )

            except APIError as e:
                logger.error("OpenAI API error: %s", str(e))
                last_error = e
                if attempt < 2:
                    await asyncio.sleep(2 ** attempt)
                else:
                    raise ValueError(
                        "El servicio de análisis no está disponible temporalmente."
                    )

        raise ValueError(f"Análisis fallido después de 3 intentos: {last_error}")

    async def _call_openai(self, prompt_text: str) -> str:
        """Make the actual API call to OpenAI."""
        response = await self._client.chat.completions.create(
            model=self._model,
            messages=[
                {"role": "system", "content": "Eres un analista de bienestar emocional. Responde SOLO en JSON."},
                {"role": "user", "content": prompt_text},
            ],
            max_tokens=self._max_tokens,
            temperature=0.3,
            response_format={"type": "json_object"},
        )
        return response.choices[0].message.content

    def _parse_response(self, raw_response: str) -> SentimentAnalysisResponse:
        """
        Parse and validate the JSON response from OpenAI.
        Uses Pydantic to enforce the schema.
        """
        data = json.loads(raw_response)
        return SentimentAnalysisResponse(**data)


# Singleton instance
_openai_client: OpenAIClient | None = None


def get_openai_client() -> OpenAIClient:
    """Get the singleton OpenAI client instance."""
    global _openai_client
    if _openai_client is None:
        _openai_client = OpenAIClient()
    return _openai_client
