import { useId } from "react";

/**
 * Logo Wingman (aile origami + étoile polaire), fond transparent.
 * IDs de gradients uniques via useId → aucune collision si le logo est rendu plusieurs fois.
 */
export default function WingmanLogo({ size = 32, className = "", title = "Wingman", ...props }) {
  const uid = useId().replace(/:/g, "");
  const L = `wm-l-${uid}`, M = `wm-m-${uid}`, D = `wm-d-${uid}`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="110 118 285 278"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label={title}
      {...props}
    >
      <defs>
        <linearGradient id={L} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F3E5AB" />
          <stop offset="1" stopColor="#DCAB6B" />
        </linearGradient>
        <linearGradient id={M} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#DCAB6B" />
          <stop offset="1" stopColor="#C8A84B" />
        </linearGradient>
        <linearGradient id={D} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8A6D29" />
          <stop offset="1" stopColor="#5C4717" />
        </linearGradient>
      </defs>

      {/* Pointes secondaires */}
      <polygon points="276,302 297,274 290,271" fill={`url(#${D})`} />
      <polygon points="273,209 297,235 302,229" fill={`url(#${L})`} />
      <polygon points="273,209 302,229 290,242" fill={`url(#${M})`} />
      <polygon points="353,207 330,233 324,229" fill={`url(#${L})`} />
      <polygon points="353,207 336,240 330,233" fill={`url(#${D})`} />
      <polygon points="353,303 336,270 329,277" fill={`url(#${M})`} />
      <polygon points="353,303 329,277 323,283" fill={`url(#${D})`} />

      {/* Aile : 3 lames + pointe plongeante */}
      <polygon points="118,125 258,208 280,245" fill={`url(#${L})`} />
      <polygon points="118,125 280,245 255,250 150,192" fill={`url(#${M})`} />
      <polygon points="125,185 295,285 260,280" fill={`url(#${L})`} />
      <polygon points="125,185 260,280 175,240" fill={`url(#${M})`} />
      <polygon points="150,245 262,282 220,284" fill={`url(#${L})`} />
      <polygon points="150,245 220,284 208,296" fill={`url(#${D})`} />
      <polygon points="228,298 262,294 185,388" fill={`url(#${M})`} />
      <polygon points="262,294 295,288 185,388" fill={`url(#${D})`} />

      {/* Étoile polaire biseautée */}
      <polygon points="313,192 304,246 313,255" fill={`url(#${L})`} />
      <polygon points="313,192 322,246 313,255" fill={`url(#${M})`} />
      <polygon points="385,255 322,246 313,255" fill={`url(#${M})`} />
      <polygon points="385,255 322,264 313,255" fill={`url(#${D})`} />
      <polygon points="313,318 322,264 313,255" fill={`url(#${D})`} />
      <polygon points="313,318 304,264 313,255" fill={`url(#${M})`} />
      <polygon points="267,255 304,264 313,255" fill={`url(#${M})`} />
      <polygon points="267,255 304,246 313,255" fill={`url(#${L})`} />
    </svg>
  );
}
