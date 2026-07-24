export interface CheckoutPlaceholderProps {
  title: string;
}

// Placeholder for a checkout step screen — the real implementation
// (card/delivery form, summary backdrop, status polling) lands in the
// checkout iteration once business rules are decided.
export function CheckoutPlaceholder({ title }: CheckoutPlaceholderProps) {
  return (
    <section style={{ padding: '1rem' }}>
      <h1>{title}</h1>
      <p>Coming soon.</p>
    </section>
  );
}
