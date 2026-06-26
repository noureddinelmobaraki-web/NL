import { useEffect, useRef } from 'react';

export function SoapBubbles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let bubbles: { x: number; y: number; size: number; speedY: number; speedX: number; hue: number }[] = [];
    let width = 0;
    let height = 0;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      
      // Determine number of bubbles based on screen size (performance)
      const numBubbles = width < 768 ? 8 : 20;
      
      bubbles = Array.from({ length: numBubbles }).map(() => createBubble(true));
    };

    const createBubble = (randomY = false) => {
      return {
        x: Math.random() * width,
        y: randomY ? Math.random() * height : height + Math.random() * 100 + 50,
        size: Math.random() * 40 + 10,
        speedY: Math.random() * 1.5 + 0.5,
        speedX: (Math.random() - 0.5) * 0.5,
        hue: Math.random() * 360
      };
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      bubbles.forEach((bubble, index) => {
        // Move
        bubble.y -= bubble.speedY;
        bubble.x += Math.sin(bubble.y * 0.01) + bubble.speedX;

        // Reset if off screen
        if (bubble.y < -bubble.size * 2) {
          bubbles[index] = createBubble(false);
        }

        // Draw bubble
        ctx.beginPath();
        ctx.arc(bubble.x, bubble.y, bubble.size, 0, Math.PI * 2);
        
        // Glassy gradient
        const gradient = ctx.createRadialGradient(
          bubble.x - bubble.size * 0.3, 
          bubble.y - bubble.size * 0.3, 
          bubble.size * 0.1,
          bubble.x, 
          bubble.y, 
          bubble.size
        );
        gradient.addColorStop(0, `hsla(${bubble.hue}, 100%, 80%, 0.4)`);
        gradient.addColorStop(0.8, `hsla(${(bubble.hue + 40) % 360}, 100%, 60%, 0.1)`);
        gradient.addColorStop(1, `hsla(${(bubble.hue + 80) % 360}, 100%, 70%, 0.5)`);
        
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Edge highlight (rainbow)
        ctx.lineWidth = 1;
        ctx.strokeStyle = `hsla(${bubble.hue}, 100%, 70%, 0.6)`;
        ctx.stroke();

        // White reflection dot
        ctx.beginPath();
        ctx.arc(bubble.x - bubble.size * 0.3, bubble.y - bubble.size * 0.3, bubble.size * 0.15, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    window.addEventListener('resize', resize);
    resize();
    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-[-1] pointer-events-none"
      style={{
        background: 'linear-gradient(135deg, #FFB36B 0%, #FF7A1A 35%, #34E89E 100%)',
      }}
    />
  );
}
