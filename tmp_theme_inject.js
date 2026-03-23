const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'Header.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

// 1. imports
if (!content.includes('useTheme')) {
    content = content.replace("import { useRouter } from 'next/navigation';", "import { useRouter } from 'next/navigation';\nimport { useTheme } from 'next-themes';");
    content = content.replace("Sparkles } from 'lucide-react';", "Sparkles, Sun, Moon } from 'lucide-react';");
}
if (!content.includes('const { theme, setTheme } = useTheme();')) {
    content = content.replace("const router = useRouter();", "const router = useRouter();\n  const { theme, setTheme } = useTheme();");
}

// 2. inject theme switcher before Subscription
const target = `<DropdownMenuItem onSelect={() => router.push("/admin/subscription")} className="flex items-center gap-2 cursor-pointer">`;
const replacement = `<DropdownMenuItem onClick={(e) => { e.preventDefault(); setTheme(theme === 'dark' ? 'light' : 'dark'); }} className="flex items-center gap-2 cursor-pointer">
                      <Moon className="h-4 w-4 hidden dark:block" />
                      <Sun className="h-4 w-4 dark:hidden" />
                      <span className="hidden dark:block">Light mode</span>
                      <span className="dark:hidden">Dark mode</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    ` + target;

if (content.includes(target) && !content.includes("setTheme(theme === 'dark'")) {
    content = content.replace(target, replacement);
}

fs.writeFileSync(filePath, content, 'utf-8');
console.log("Theme switcher injected!");
