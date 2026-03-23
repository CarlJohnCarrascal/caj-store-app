import re
import sys

def main():
    file_path = r"e:\MyProject\GIT\caj-store-app\src\components\Header.tsx"
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Check if useRouter is imported
    if "useRouter" not in content:
        # Import useRouter
        content = content.replace("import Link from 'next/link';", "import Link from 'next/link';\nimport { useRouter } from 'next/navigation';")
        
    # Inject router initialization inside Header component
    if "const router = useRouter();" not in content:
        content = content.replace("export default function Header() {", "export default function Header() {\n  const router = useRouter();")

    # Replace <DropdownMenuItem asChild><Link href="...">...</Link></DropdownMenuItem>
    # Note: Regex to handle arbitrary nested things inside Link.
    pattern = r'<DropdownMenuItem asChild><Link href="([^"]+)"([^>]*)>(.*?)<\/Link><\/DropdownMenuItem>'
    
    def replacer(match):
        href = match.group(1)
        # className and other props on Link
        props = match.group(2)
        inner = match.group(3)
        return f'<DropdownMenuItem onSelect={{() => router.push("{href}")}}{props}>{inner}</DropdownMenuItem>'

    new_content = re.sub(pattern, replacer, content, flags=re.DOTALL)
    
    # Now for <DropdownMenuItem asChild><Link href="/admin/subscription" ...>
    # There are also multiline ones like:
    # <DropdownMenuItem asChild>
    #   <Link href="/admin/subscription" className="flex items-center gap-2 cursor-pointer">
    #     <CreditCard className="h-4 w-4" /> Subscription
    #   </Link>
    # </DropdownMenuItem>
    pattern_multi = r'<DropdownMenuItem asChild>\s*<Link href="([^"]+)"([^>]*)>\s*(.*?)\s*<\/Link>\s*<\/DropdownMenuItem>'
    new_content = re.sub(pattern_multi, replacer, new_content, flags=re.DOTALL)

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
        
    print("Routing references updated!")

if __name__ == "__main__":
    main()
