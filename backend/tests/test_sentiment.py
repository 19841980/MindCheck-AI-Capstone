import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.ai.openai_client import OpenAIClient
from app.schemas.journal import SentimentAnalysisResponse
from openai import RateLimitError

@pytest.mark.asyncio
async def test_analyze_emotional_sentiment_success():
    """Verify that a successful OpenAI call is correctly parsed into the SentimentAnalysisResponse schema."""
    client = OpenAIClient()
    
    # Mock the internal AsyncOpenAI chat completions create call
    mock_response = MagicMock()
    mock_choice = MagicMock()
    mock_message = MagicMock()
    
    mock_message.content = """
    {
      "sentiment_score": 0.85,
      "dominant_emotion": "alegría",
      "secondary_emotions": ["calma"],
      "risk_level": "bajo",
      "risk_justification": "El estudiante se siente bien y motivado.",
      "keywords": ["feliz", "motivada"],
      "recommendations": ["Sigue adelante"],
      "crisis_indicators": false
    }
    """
    mock_choice.message = mock_message
    mock_response.choices = [mock_choice]
    
    client._client.chat.completions.create = AsyncMock(return_value=mock_response)
    
    # Run the method
    result = await client.analyze_emotional_sentiment("Hoy me siento súper feliz.")
    
    # Assert schema validation
    assert isinstance(result, SentimentAnalysisResponse)
    assert result.sentiment_score == 0.85
    assert result.dominant_emotion == "alegría"
    assert result.risk_level == "bajo"
    assert "feliz" in result.keywords
    assert "Sigue adelante" in result.recommendations

@pytest.mark.asyncio
async def test_analyze_emotional_sentiment_rate_limit_retry():
    """Verify that a RateLimitError triggers retry logic with exponential backoff and eventual success."""
    client = OpenAIClient()
    
    # Mock exponential backoff sleep to speed up tests
    with patch("asyncio.sleep", AsyncMock()) as mock_sleep:
        # Create a mock rate limit error
        mock_response = MagicMock()
        rate_limit_error = RateLimitError(
            message="Rate limit exceeded",
            response=mock_response,
            body={}
        )
        
        # Second call succeeds
        mock_success_response = MagicMock()
        mock_choice = MagicMock()
        mock_message = MagicMock()
        mock_message.content = """
        {
          "sentiment_score": -0.5,
          "dominant_emotion": "ansiedad",
          "secondary_emotions": ["estrés"],
          "risk_level": "moderado",
          "risk_justification": "Preocupación.",
          "keywords": ["nerviosa"],
          "recommendations": ["Respira"],
          "crisis_indicators": false
        }
        """
        mock_choice.message = mock_message
        mock_success_response.choices = [mock_choice]
        
        client._client.chat.completions.create = AsyncMock(
            side_effect=[rate_limit_error, mock_success_response]
        )
        
        result = await client.analyze_emotional_sentiment("Tengo examen y estoy muy nerviosa.")
        
        assert isinstance(result, SentimentAnalysisResponse)
        assert result.sentiment_score == -0.5
        assert result.dominant_emotion == "ansiedad"
        assert client._client.chat.completions.create.call_count == 2
        mock_sleep.assert_called_once()
