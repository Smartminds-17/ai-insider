"use client";

interface VideoEmbedProps {
  youtubeVideoId: string;
  title: string;
}

export default function VideoEmbed({ youtubeVideoId, title }: VideoEmbedProps) {
  // Standard iframe embed — plays through YouTube's actual player, so watch
  // time/views count toward the creator's channel (see architecture notes).
  return (
    <div className="aspect-video w-full rounded-lg overflow-hidden bg-black">
      <iframe
        width="100%"
        height="100%"
        src={`https://www.youtube.com/embed/${youtubeVideoId}`}
        title={title}
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}
