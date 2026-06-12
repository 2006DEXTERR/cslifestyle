import Link from 'next/link';
import { Sparkles, Twitter, Instagram, Youtube, Facebook } from 'lucide-react';
import { categories } from '@/lib/data';

const footerColumns = [
  {
    title: 'Popular Categories',
    links: categories.slice(0, 5).map(c => ({ name: c.name, href: `/categories/${c.slug}` })),
  },
  {
    title: 'Buying Guides',
    links: [
      { name: 'Smartphone Buying Guide', href: '/guides/best-smartphones-under-30000' },
      { name: 'Earbuds Guide', href: '/guides/best-wireless-earbuds-2024' },
      { name: 'Laptop Guide', href: '/guides/best-laptops-for-students' },
      { name: 'Smartwatch Guide', href: '/guides/smartwatch-buying-guide' },
      { name: 'TV Buying Guide', href: '/guides/best-tv-buying-guide' },
    ],
  },
  {
    title: 'Top Comparisons',
    links: [
      { name: 'iPhone vs Samsung', href: '/comparisons/iphone-15-vs-samsung-s24' },
      { name: 'boAt vs Noise', href: '/comparisons/boat-vs-noise-earbuds' },
      { name: 'MacBook vs Dell XPS', href: '/comparisons/macbook-vs-dell-xps' },
    ],
  },
  {
    title: 'Company',
    links: [
      { name: 'About Us', href: '/about' },
      { name: 'Contact', href: '/contact' },
      { name: 'Careers', href: '/careers' },
      { name: 'Advertise', href: '/advertise' },
      { name: 'Press', href: '/press' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { name: 'Privacy Policy', href: '/privacy' },
      { name: 'Terms of Service', href: '/terms' },
      { name: 'Affiliate Disclosure', href: '/affiliate-disclosure' },
      { name: 'Cookie Policy', href: '/cookies' },
    ],
  },
];

const socialLinks = [
  { name: 'Twitter', icon: Twitter, href: 'https://twitter.com/cslifestyle' },
  { name: 'Instagram', icon: Instagram, href: 'https://instagram.com/cslifestyle' },
  { name: 'YouTube', icon: Youtube, href: 'https://youtube.com/cslifestyle' },
  { name: 'Facebook', icon: Facebook, href: 'https://facebook.com/cslifestyle' },
];

export function Footer() {
  return (
    <footer className="w-full border-t bg-background">
      {/* Main Footer */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
          {/* Brand Column */}
          <div className="col-span-2 md:col-span-3 lg:col-span-1 lg:pr-8">
            <Link href="/" className="flex items-center space-x-2 mb-4">
              <div className="relative flex items-center justify-center w-8 h-8">
                <Sparkles className="w-6 h-6 brand-gradient-text" />
              </div>
              <span className="text-xl font-bold">
                <span className="brand-gradient-text">CS</span>
                <span className="text-foreground">Lifestyle</span>
              </span>
            </Link>
            <p className="text-sm text-muted-foreground mb-4">
              India's most trusted product discovery platform. We help millions of users make informed buying decisions.
            </p>
            <div className="flex gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-9 h-9 rounded-full bg-muted hover:bg-muted/80 transition-colors"
                >
                  <social.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Links Columns */}
          {footerColumns.map((column) => (
            <div key={column.title}>
              <h4 className="font-semibold mb-4">{column.title}</h4>
              <ul className="space-y-3">
                {column.links.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} CSLifestyle.in. All rights reserved.
          </p>
          <p className="text-sm text-muted-foreground">
            Made with ❤️ in India
          </p>
        </div>
      </div>
    </footer>
  );
}
