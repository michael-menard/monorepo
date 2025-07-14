import { FaTwitter, FaGithub, FaEnvelope, FaLinkedin, FaInstagram } from 'react-icons/fa';

const Footer = () => {
  const socialLinks = [
    {
      name: 'Twitter',
      url: 'https://twitter.com/legoprojects',
      icon: FaTwitter,
      color: 'hover:text-blue-400'
    },
    {
      name: 'GitHub',
      url: 'https://github.com/legoprojects',
      icon: FaGithub,
      color: 'hover:text-gray-700'
    },
    {
      name: 'LinkedIn',
      url: 'https://linkedin.com/company/legoprojects',
      icon: FaLinkedin,
      color: 'hover:text-blue-600'
    },
    {
      name: 'Instagram',
      url: 'https://instagram.com/legoprojects',
      icon: FaInstagram,
      color: 'hover:text-pink-500'
    },
    {
      name: 'Contact',
      url: 'mailto:contact@legoprojects.com',
      icon: FaEnvelope,
      color: 'hover:text-indigo-600'
    }
  ];

  return (
    <footer className="w-full py-6 bg-gray-100 text-center text-sm text-gray-500 border-t sticky bottom-0 z-40">
      <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4 px-4">
        <div className="flex flex-col items-center md:items-start">
          <span>&copy; {new Date().getFullYear()} Lego Projects. All rights reserved.</span>
          <div className="flex gap-2 mt-2 text-xs text-gray-400">
            <a href="/privacy" className="hover:text-gray-600 transition-colors">Privacy Policy</a>
            <span>•</span>
            <a href="/terms" className="hover:text-gray-600 transition-colors">Terms of Service</a>
          </div>
        </div>
        
        <div className="flex gap-4 justify-center">
          {socialLinks.map((link) => {
            const Icon = link.icon;
            return (
              <a
                key={link.name}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`p-2 rounded-full transition-all duration-200 ${link.color} focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2`}
                aria-label={`Follow us on ${link.name}`}
              >
                <Icon className="w-5 h-5" />
              </a>
            );
          })}
        </div>
      </div>
    </footer>
  );
};

export default Footer; 