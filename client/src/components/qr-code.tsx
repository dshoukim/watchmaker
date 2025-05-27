import { useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';

interface QRCodeProps {
  value: string;
  size?: number;
  className?: string;
}

export function QRCode({ value, size = 200, className = '' }: QRCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Simple QR code placeholder - in a real app, use a library like qrcode
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = size;
    canvas.height = size;

    // Fill background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);

    // Create a simple pattern that represents the room code
    const blockSize = size / 20;
    
    // Generate a deterministic pattern based on the value
    const pattern = Array.from(value).map(char => char.charCodeAt(0)).join('');
    
    ctx.fillStyle = '#000000';
    
    for (let i = 0; i < 20; i++) {
      for (let j = 0; j < 20; j++) {
        const index = i * 20 + j;
        const charCode = parseInt(pattern[index % pattern.length] || '1');
        
        if (charCode % 2 === 0) {
          ctx.fillRect(i * blockSize, j * blockSize, blockSize, blockSize);
        }
      }
    }

    // Add corner markers
    const markerSize = blockSize * 3;
    
    // Top-left
    ctx.fillRect(0, 0, markerSize, markerSize);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(blockSize, blockSize, blockSize, blockSize);
    
    // Top-right
    ctx.fillStyle = '#000000';
    ctx.fillRect(size - markerSize, 0, markerSize, markerSize);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(size - markerSize + blockSize, blockSize, blockSize, blockSize);
    
    // Bottom-left
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, size - markerSize, markerSize, markerSize);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(blockSize, size - markerSize + blockSize, blockSize, blockSize);

  }, [value, size]);

  return (
    <Card className={`p-4 bg-white inline-block ${className}`}>
      <canvas ref={canvasRef} className="block" />
    </Card>
  );
}
