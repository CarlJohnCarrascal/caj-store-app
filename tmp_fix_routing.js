const fs = require('fs');
const path = require('path');

function main() {
    const filePath = path.join(__dirname, 'src', 'components', 'Header.tsx');
    let content = fs.readFileSync(filePath, 'utf-8');

    if (!content.includes('useRouter')) {
        content = content.replace("import Link from 'next/link';", "import Link from 'next/link';\nimport { useRouter } from 'next/navigation';");
    }

    if (!content.includes('const router = useRouter();')) {
        content = content.replace("export default function Header() {", "export default function Header() {\n  const router = useRouter();");
    }

    // Replace single line matches
    let newContent = content.replace(/<DropdownMenuItem asChild><Link href="([^"]+)"([^>]*)>(.*?)<\/Link><\/DropdownMenuItem>/gs, (match, href, props, inner) => {
        return `<DropdownMenuItem onSelect={() => router.push("${href}")}${props}>${inner}</DropdownMenuItem>`;
    });

    // Replace multiline matches
    newContent = newContent.replace(/<DropdownMenuItem asChild>\s*<Link href="([^"]+)"([^>]*)>\s*(.*?)\s*<\/Link>\s*<\/DropdownMenuItem>/gs, (match, href, props, inner) => {
        return `<DropdownMenuItem onSelect={() => router.push("${href}")}${props}>\n${inner}\n</DropdownMenuItem>`;
    });

    fs.writeFileSync(filePath, newContent, 'utf-8');
    console.log("Routing references updated via Node!");
}

main();
