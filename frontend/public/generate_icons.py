import os
from PIL import Image, ImageDraw

def create_icon(size, filename, bg_color=(255, 255, 255, 255), is_maskable=False):
    # Create a new image with transparent background (or solid for maskable)
    img = Image.new("RGBA", (size, size), bg_color if is_maskable else (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Scale parameters according to size
    margin = size * 0.1
    stroke_width = int(size * 0.08)
    
    # Outer circle bounds
    outer_left = margin
    outer_top = margin
    outer_right = size - margin
    outer_bottom = size - margin
    
    # Draw outer circle stroke
    # primary color: #2D6A4F (RGB: 45, 106, 79)
    draw.ellipse(
        [outer_left, outer_top, outer_right, outer_bottom],
        outline=(45, 106, 79, 255),
        width=stroke_width
    )
    
    # Inner circle bounds
    inner_margin = size * 0.35
    inner_left = inner_margin
    inner_top = inner_margin
    inner_right = size - inner_margin
    inner_bottom = size - inner_margin
    
    # Draw inner solid circle
    # primary light color: #40916C (RGB: 64, 145, 108)
    draw.ellipse(
        [inner_left, inner_top, inner_right, inner_bottom],
        fill=(64, 145, 108, 255)
    )
    
    # Save the image
    os.makedirs(os.path.dirname(filename), exist_ok=True)
    img.save(filename, "PNG")
    print(f"Created {filename} ({size}x{size})")

if __name__ == "__main__":
    # Create regular and maskable icons
    # icon-192.png is maskable, so we give it a solid white background
    create_icon(192, "icons/icon-192.png", bg_color=(255, 255, 255, 255), is_maskable=True)
    create_icon(512, "icons/icon-512.png", bg_color=(255, 255, 255, 255), is_maskable=False)
