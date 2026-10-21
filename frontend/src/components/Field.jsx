export default function Field({ label, ...props }) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <input className="field" {...props} />
    </label>
  );
}
