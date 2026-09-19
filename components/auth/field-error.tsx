export function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className="form-field-error">{messages[0]}</p>;
}
