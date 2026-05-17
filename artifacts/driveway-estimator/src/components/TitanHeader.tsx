export function TitanHeader({ subtitle }: { subtitle?: string }) {
  return (
    <div className="text-center">
      <h1 className="titan-title">TITAN</h1>
      <h2 className="enterprises-title">ENTERPRISES</h2>
      <div className="titan-blue-line" />
      {subtitle && (
        <p className="text-xs uppercase tracking-widest mt-2" style={{ color: "hsl(215 10% 60%)" }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
