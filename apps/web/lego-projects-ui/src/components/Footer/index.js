import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
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
    return (_jsx("footer", { className: "w-full py-6 bg-gray-100 text-center text-sm text-gray-500 border-t sticky bottom-0 z-40", children: _jsxs("div", { className: "container mx-auto flex flex-col md:flex-row items-center justify-between gap-4 px-4", children: [_jsxs("div", { className: "flex flex-col items-center md:items-start", children: [_jsxs("span", { children: ["\u00A9 ", new Date().getFullYear(), " Lego Projects. All rights reserved."] }), _jsxs("div", { className: "flex gap-2 mt-2 text-xs text-gray-400", children: [_jsx("a", { href: "/privacy", className: "hover:text-gray-600 transition-colors", children: "Privacy Policy" }), _jsx("span", { children: "\u2022" }), _jsx("a", { href: "/terms", className: "hover:text-gray-600 transition-colors", children: "Terms of Service" })] })] }), _jsx("div", { className: "flex gap-4 justify-center", children: socialLinks.map((link) => {
                        const Icon = link.icon;
                        return (_jsx("a", { href: link.url, target: "_blank", rel: "noopener noreferrer", className: `p-2 rounded-full transition-all duration-200 ${link.color} focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2`, "aria-label": `Follow us on ${link.name}`, children: _jsx(Icon, { className: "w-5 h-5" }) }, link.name));
                    }) })] }) }));
};
export default Footer;
