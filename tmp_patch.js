const fs = require('fs');
const path = require('path');

async function patch() {
  const adminPath = path.join(__dirname, 'src', 'app', 'admin', 'checkout', 'page.tsx');
  const posPath = path.join(__dirname, 'src', 'app', 'pos', 'checkout', 'page.tsx');

  const adminContent = fs.readFileSync(adminPath, 'utf8');
  let posContent = fs.readFileSync(posPath, 'utf8');

  // Extract Order Summary from admin
  const summaryInnerIdx = adminContent.indexOf('<Card className="sticky top-20">');
  const summaryStart = adminContent.lastIndexOf('<div className="lg:col-span-2">', summaryInnerIdx);
  
  const dialogIdxAdmin = adminContent.indexOf('<Dialog open={isCustomerDialogOpen}');
  const summaryEnd = adminContent.lastIndexOf('</div>', dialogIdxAdmin) + 6;
  
  if (summaryStart === -1 || summaryEnd < summaryStart) {
    console.error("Could not find admin summary block");
    process.exit(1);
  }
  
  const orderSummaryBlock = adminContent.substring(summaryStart, summaryEnd);

  // Remove the <CardFooter> from Payment Details in pos Content
  const footerStart = posContent.indexOf('<CardFooter className="flex flex-col gap-2">');
  const footerEndStr = '</CardFooter>';
  
  if (footerStart > -1) {
    // search backward for newline
    const lastSpaces = posContent.lastIndexOf('\n', footerStart);
    const footerEnd = posContent.indexOf(footerEndStr, footerStart) + footerEndStr.length;
    posContent = posContent.substring(0, lastSpaces) + '\n' + posContent.substring(footerEnd);
  }

  // Grid structure wrap for POS
  posContent = posContent.replace(
    '<div className="space-y-8">',
    '<div className="grid lg:grid-cols-4 gap-8">\n      <div className="lg:col-span-2 space-y-8">'
  );

  const dialogStartStr = '<Dialog open={isCustomerDialogOpen}';
  const posDialogIdx = posContent.indexOf(dialogStartStr);
  const posDialogLastSpaces = posContent.lastIndexOf('\n', posDialogIdx);
  
  posContent = 
    posContent.substring(0, posDialogLastSpaces) +
    '\n      </div>\n\n      ' + 
    orderSummaryBlock + 
    '\n      </div>\n' + 
    posContent.substring(posDialogLastSpaces);

  fs.writeFileSync(posPath, posContent, 'utf8');
  console.log("Patched POS checkout");

  // Path Header
  const headerPath = path.join(__dirname, 'src', 'components', 'Header.tsx');
  let headerContent = fs.readFileSync(headerPath, 'utf8');

  if (!headerContent.includes('usePathname')) {
    headerContent = headerContent.replace(
      "import { useRouter } from 'next/navigation';",
      "import { useRouter, usePathname } from 'next/navigation';"
    );
    headerContent = headerContent.replace(
      "  const router = useRouter();",
      "  const router = useRouter();\n  const pathname = usePathname();"
    );
  }

  // target specifically the conditional block for shopping bag
  const headerTarget = `{activeStoreId && (
                <Button variant="ghost" size="icon" onClick={() => setCartOpen(true)} className="relative">
                  <ShoppingBag className="h-7 w-7" />`;
  
  const headerReplacement = `{activeStoreId && !['/pos/checkout', '/pos/history', '/pos/expenses'].includes(pathname) && (
                <Button variant="ghost" size="icon" onClick={() => setCartOpen(true)} className="relative">
                  <ShoppingBag className="h-7 w-7" />`;

  headerContent = headerContent.replace(headerTarget, headerReplacement);
  
  fs.writeFileSync(headerPath, headerContent, 'utf8');
  console.log("Patched Header");
}

patch().catch(console.error);
