import { config } from 'dotenv';
config();

import '@/ai/flows/generate-product-description.ts';
import '@/ai/flows/extract-transaction-details.ts';
import '@/ai/flows/generate-product-image.ts';
import '@/ai/flows/extract-transaction-details-from-image.ts';
