export function Avatar({ src, alt }: { src: string; alt: string }) {
  return <img src={src} alt={alt} className="h-8 w-8 rounded-full object-cover" />;
}
