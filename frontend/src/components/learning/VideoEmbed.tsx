"use client";

interface VideoEmbedProps {
  url: string;
  title?: string;
}

function youtubeId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=)([\w-]+)/);
  return m ? m[1] : null;
}

export function VideoEmbed({ url, title }: VideoEmbedProps) {
  const id = youtubeId(url);
  if (!id) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-africhess-gold underline text-sm"
      >
        {title || url}
      </a>
    );
  }
  return (
    <div className="aspect-video w-full rounded-xl overflow-hidden border border-white/10">
      <iframe
        title={title || "Lesson video"}
        src={`https://www.youtube.com/embed/${id}`}
        className="w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}
