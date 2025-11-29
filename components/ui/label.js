export function Label({ children, ...props }) {
  return (
    <label {...props} className="font-medium mb-1 block">
      {children}
    </label>
  );
}
