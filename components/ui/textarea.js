export function Textarea(props) {
  return (
    <textarea
      {...props}
      className={`border p-2 rounded w-full ${props.className || ""}`}
    />
  );
}
