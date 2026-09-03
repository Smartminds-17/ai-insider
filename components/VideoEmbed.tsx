"use client";

interface VideoEmbedProps {
  youtubeVideoId: string;
  title: string;
}

export default function VideoEmbed({ youtubeVideoId, title }: VideoEmbedProps) {
  // Add origin parameter to prevent YouTube redirect loop - required for embedded player security
  const embedUrl = `https://www.youtube.com/embed/${youtubeVideoId}?origin=${typeof window !== 'undefined' ? window.location.origin : ''}`;
  
  return (
    <div className="aspect-video w-full rounded-lg overflow-hidden bg-black">
      <iframe
        width="100%"
        height="100%"
        src={embedUrl}
        title={title}
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}