export default function MaxMethodLogo({ animated = false }) {
  const className = animated ? 'mm-logo' : 'mm-logo mm-logo--static';
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 680 320"
      role="img"
      aria-label="Max Method - Break the Standard"
      className={className}
    >
      <title>Max Method</title>
      <desc>Max Method logo: barbell assembles, wordmark stamps in, tagline reveals.</desc>
      <defs>
        <style>{`
          @keyframes mm-bar-drop {
            0% { transform: translateY(-200px); opacity: 0; }
            10% { transform: translateY(-200px); opacity: 0; }
            25% { transform: translateY(8px); opacity: 1; }
            30% { transform: translateY(-3px); }
            35% { transform: translateY(0); }
            100% { transform: translateY(0); opacity: 1; }
          }
          .mm-bar { animation: mm-bar-drop 13s ease-out forwards; }

          @keyframes mm-plate-inner-left {
            0%, 35% { transform: translateX(-300px); opacity: 0; }
            48% { transform: translateX(0); opacity: 1; }
            50% { transform: translateX(4px); }
            53% { transform: translateX(0); }
            100% { transform: translateX(0); opacity: 1; }
          }
          @keyframes mm-plate-inner-right {
            0%, 35% { transform: translateX(300px); opacity: 0; }
            48% { transform: translateX(0); opacity: 1; }
            50% { transform: translateX(-4px); }
            53% { transform: translateX(0); }
            100% { transform: translateX(0); opacity: 1; }
          }
          .mm-plate-inner-l { animation: mm-plate-inner-left 13s ease-out forwards; }
          .mm-plate-inner-r { animation: mm-plate-inner-right 13s ease-out forwards; }

          @keyframes mm-plate-outer-left {
            0%, 45% { transform: translateX(-350px); opacity: 0; }
            56% { transform: translateX(0); opacity: 1; }
            58% { transform: translateX(4px); }
            61% { transform: translateX(0); }
            100% { transform: translateX(0); opacity: 1; }
          }
          @keyframes mm-plate-outer-right {
            0%, 45% { transform: translateX(350px); opacity: 0; }
            56% { transform: translateX(0); opacity: 1; }
            58% { transform: translateX(-4px); }
            61% { transform: translateX(0); }
            100% { transform: translateX(0); opacity: 1; }
          }
          .mm-plate-outer-l { animation: mm-plate-outer-left 13s ease-out forwards; }
          .mm-plate-outer-r { animation: mm-plate-outer-right 13s ease-out forwards; }

          @keyframes mm-collar-snap-left {
            0%, 53% { transform: translateX(-400px); opacity: 0; }
            62% { transform: translateX(0); opacity: 1; }
            100% { transform: translateX(0); opacity: 1; }
          }
          @keyframes mm-collar-snap-right {
            0%, 53% { transform: translateX(400px); opacity: 0; }
            62% { transform: translateX(0); opacity: 1; }
            100% { transform: translateX(0); opacity: 1; }
          }
          .mm-collar-l { animation: mm-collar-snap-left 13s ease-out forwards; }
          .mm-collar-r { animation: mm-collar-snap-right 13s ease-out forwards; }

          @keyframes mm-stamp-in {
            0%, 62% { opacity: 0; transform: scale(1.4); filter: blur(4px); }
            70% { opacity: 1; transform: scale(0.95); filter: blur(0); }
            73% { transform: scale(1.02); }
            77% { opacity: 1; transform: scale(1); filter: blur(0); }
            100% { opacity: 1; transform: scale(1); filter: blur(0); }
          }
          .mm-wordmark {
            transform-origin: 340px 195px;
            transform-box: fill-box;
            animation: mm-stamp-in 13s ease-out forwards;
          }

          @keyframes mm-rule-sweep {
            0%, 70% { transform: scaleX(0); opacity: 0; }
            77% { transform: scaleX(1); opacity: 0.6; }
            100% { transform: scaleX(1); opacity: 0.6; }
          }
          .mm-rule-left {
            transform-origin: 195px 256px;
            animation: mm-rule-sweep 13s ease-out forwards;
          }
          .mm-rule-right {
            transform-origin: 485px 256px;
            animation: mm-rule-sweep 13s ease-out forwards;
          }

          @keyframes mm-tagline-fade {
            0%, 70% { opacity: 0; letter-spacing: 16px; }
            77% { opacity: 0.9; letter-spacing: 6px; }
            100% { opacity: 0.9; letter-spacing: 6px; }
          }
          .mm-tagline { animation: mm-tagline-fade 13s ease-out forwards; }
        `}</style>
      </defs>

      <g transform="translate(340, 90)" fill="#e63946">
        <rect className="mm-bar" x="-110" y="-3" width="220" height="6" rx="1" />
        <rect className="mm-plate-inner-l" x="-90" y="-22" width="14" height="44" />
        <rect className="mm-plate-inner-r" x="76" y="-22" width="14" height="44" />
        <rect className="mm-plate-outer-l" x="-118" y="-30" width="20" height="60" />
        <rect className="mm-plate-outer-r" x="98" y="-30" width="20" height="60" />
        <rect className="mm-collar-l" x="-126" y="-8" width="6" height="16" />
        <rect className="mm-collar-r" x="120" y="-8" width="6" height="16" />
      </g>

      <text
        className="mm-wordmark"
        x="340"
        y="210"
        textAnchor="middle"
        fontFamily="'Permanent Marker', cursive"
        fontSize="76"
        fill="#e63946"
        letterSpacing="3"
      >
        MAX METHOD
      </text>

      <line className="mm-rule-left" x1="195" y1="256" x2="100" y2="256" stroke="#e63946" strokeWidth="1" />
      <line className="mm-rule-right" x1="485" y1="256" x2="580" y2="256" stroke="#e63946" strokeWidth="1" />

      <text
        className="mm-tagline"
        x="340"
        y="260"
        textAnchor="middle"
        fontFamily="'Helvetica Neue', Arial, sans-serif"
        fontSize="13"
        fontWeight="600"
        fill="#e63946"
      >
        BREAK THE STANDARD
      </text>
    </svg>
  );
}
