import { Facebook, Instagram, Linkedin } from 'lucide-react'

export const SOCIAL_LINKS = {
  facebook: 'https://www.facebook.com/people/EventEcos/61580708045237/',
  instagram: 'https://www.instagram.com/eventecos100/',
  linkedin: 'https://www.linkedin.com/company/eventecos/',
} as const

const iconButton =
  'inline-flex h-11 w-11 items-center justify-center rounded-full text-white shadow-lg transition-transform duration-200 hover:-translate-y-0.5 hover:brightness-110'

/** "Follow Us" column for the dark site footers. */
export default function FollowUs() {
  return (
    <div>
      <h4 className="text-white font-bold mb-4">Follow Us</h4>
      <div className="flex items-center gap-3 mb-3">
        <a
          href={SOCIAL_LINKS.facebook}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="EventEcos on Facebook"
          className={`${iconButton} bg-[#1877F2] shadow-[#1877F2]/30`}
        >
          <Facebook className="h-5 w-5" />
        </a>
        <a
          href={SOCIAL_LINKS.instagram}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="EventEcos on Instagram"
          className={`${iconButton} bg-gradient-to-tr from-[#feda75] via-[#d62976] to-[#4f5bd5] shadow-[#d62976]/30`}
        >
          <Instagram className="h-5 w-5" />
        </a>
        <a
          href={SOCIAL_LINKS.linkedin}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="EventEcos on LinkedIn"
          className={`${iconButton} bg-[#0A66C2] shadow-[#0A66C2]/30`}
        >
          <Linkedin className="h-5 w-5" />
        </a>
      </div>
      <p className="text-gray-400 text-sm">Stay connected with company news, event updates, and more.</p>
    </div>
  )
}
