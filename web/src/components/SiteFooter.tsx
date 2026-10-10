import { Brand } from './Brand';

export function SiteFooter({
  note = 'Independent from The University of Texas at Austin. Quest and related marks belong to their respective owners.',
}: {
  note?: string;
}) {
  return (
    <footer>
      <Brand subtitle="An IEXDevs student project" />
      <p>{note}</p>
      <div className="footer-links">
        <a href="/">Product</a>
        <a href="/privacy">Privacy</a>
        <a href="https://iexdevs.com/contact">Contact</a>
        <a href="https://iexdevs.com">IEXDevs</a>
      </div>
    </footer>
  );
}
