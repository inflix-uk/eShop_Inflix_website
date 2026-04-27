import axios from 'axios';
import { SitemapStream, streamToPromise } from 'sitemap';
import { Readable } from 'stream';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://aromadesire.com';

const fetchUrls = async () => {
    try {
        console.log(`Fetching sitemap data from: ${API_URL}/create/sitemap`);
        const response = await axios.post(`${API_URL}/create/sitemap`);
        if (response.status !== 200) {
            throw new Error(`Failed to fetch URLs: Status code ${response.status}`);
        }
        return response.data;
    } catch (error) {
        console.error('Error fetching URLs:', error);
        return [];
    }
};

const generateSitemap = async () => {
    console.log(`Generating sitemap for: ${BASE_URL}`);
    
    const links = await fetchUrls();
    if (links.length === 0) {
        console.error('No URLs to generate sitemap');
        return;
    }

    // Use SitemapStream to create a valid XML format
    const stream = new SitemapStream({ hostname: BASE_URL });
    
    try {
        const sitemap = await streamToPromise(Readable.from(links).pipe(stream));
        // Root file only — public/sitemap.xml conflicts with src/app/sitemap.ts in Next.js
        fs.writeFileSync('./sitemap.generated.xml', sitemap.toString());
        console.log(`Sitemap written to ./sitemap.generated.xml (${links.length} URLs). Live URL: ${BASE_URL}/sitemap.xml`);
    } catch (err) {
        console.error('Error generating sitemap:', err);
    }
};

generateSitemap();
