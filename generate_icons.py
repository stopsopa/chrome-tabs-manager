from PIL import Image, ImageDraw
import os

def draw_icon(size, output_path):
    # Base size is 32x32
    scale = size / 32.0
    
    # Create transparent image
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Colors
    orange = "#FF9F1C"
    black = "black"
    
    # Stroke width scaled
    stroke_width = max(1, int(2 * scale))
    
    # Coordinates from SVG:
    # rect x="3" y="6" width="26" height="20" rx="2"
    # line x1="3" y1="12" x2="29" y2="12"
    # circle cx="7" cy="9" r="1.5"
    # circle cx="11" cy="9" r="1.5"
    
    # Helper to scale coordinates
    def s(val):
        return val * scale

    # Draw Main Rectangle (Browser Window)
    # PIL rounded_rectangle takes [x0, y0, x1, y1]
    rect_coords = [s(3), s(6), s(29), s(26)]
    radius = s(2)
    draw.rounded_rectangle(rect_coords, radius=radius, fill=orange, outline=black, width=stroke_width)
    
    # Draw Separator Line
    # Adjust y to be crisp
    line_y = s(12)
    draw.line([s(3), line_y, s(29), line_y], fill=black, width=stroke_width)
    
    # Draw Circles (Buttons)
    # PIL ellipse takes bounding box [x0, y0, x1, y1]
    r = s(1.5)
    
    # Circle 1
    cx1, cy1 = s(7), s(9)
    draw.ellipse([cx1 - r, cy1 - r, cx1 + r, cy1 + r], fill=black)
    
    # Circle 2
    cx2, cy2 = s(11), s(9)
    draw.ellipse([cx2 - r, cy2 - r, cx2 + r, cy2 + r], fill=black)
    
    # Save
    img.save(output_path, "PNG")
    print(f"Generated {output_path} ({size}x{size})")

def main():
    sizes = [16, 32, 48, 128]
    output_dir = "extension/images"
    
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        
    for size in sizes:
        output_path = os.path.join(output_dir, f"icon{size}.png")
        draw_icon(size, output_path)

if __name__ == "__main__":
    main()
