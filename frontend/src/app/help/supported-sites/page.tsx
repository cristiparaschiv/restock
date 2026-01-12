'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Search, Globe, Sparkles, ExternalLink } from 'lucide-react';

interface SupportedSitesData {
  library_sites: string[];
  custom_sites: string[];
  total_count: number;
  ai_extraction_available: boolean;
}

export default function SupportedSitesPage() {
  const router = useRouter();
  const [data, setData] = useState<SupportedSitesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await api.getSupportedSites();
        setData(result);
      } catch (error) {
        console.error('Failed to fetch supported sites:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredSites = useMemo(() => {
    if (!data) return { library: [], custom: [] };

    const searchLower = search.toLowerCase();
    return {
      library: data.library_sites.filter(site =>
        site.toLowerCase().includes(searchLower)
      ),
      custom: data.custom_sites.filter(site =>
        site.toLowerCase().includes(searchLower)
      ),
    };
  }, [data, search]);

  const totalFiltered = filteredSites.library.length + filteredSites.custom.length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Supported Recipe Websites</h1>
            <p className="text-muted-foreground">
              {data?.total_count} sites supported for automatic import
            </p>
          </div>
        </div>

        {/* AI Status */}
        <div className="mb-6 p-4 rounded-lg border bg-card">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <h3 className="font-medium">AI Extraction</h3>
              {data?.ai_extraction_available ? (
                <p className="text-sm text-muted-foreground">
                  Enabled - Recipes from unsupported sites can be extracted using AI
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Not configured - To import from unsupported sites, add <code className="bg-muted px-1 rounded">ANTHROPIC_API_KEY</code> to your environment
                </p>
              )}
            </div>
            <Badge variant={data?.ai_extraction_available ? 'default' : 'secondary'}>
              {data?.ai_extraction_available ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search websites..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Results count */}
        {search && (
          <p className="text-sm text-muted-foreground mb-4">
            Found {totalFiltered} sites matching "{search}"
          </p>
        )}

        {/* Custom Scrapers Section */}
        {filteredSites.custom.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Custom Scrapers
              <Badge variant="secondary">{filteredSites.custom.length}</Badge>
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Sites with custom-built scrapers for better extraction accuracy
            </p>
            <div className="grid gap-2">
              {filteredSites.custom.map((site) => (
                <a
                  key={site}
                  href={`https://${site}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent transition-colors"
                >
                  <span className="font-medium">{site}</span>
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Library Scrapers Section */}
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Supported Websites
            <Badge variant="secondary">{filteredSites.library.length}</Badge>
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Powered by the <a
              href="https://github.com/hhursev/recipe-scrapers"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              recipe-scrapers
            </a> library
          </p>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
            {filteredSites.library.map((site) => (
              <a
                key={site}
                href={`https://${site}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-2 rounded-lg border bg-card hover:bg-accent transition-colors text-sm"
              >
                <span className="truncate">{site}</span>
                <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0 ml-2" />
              </a>
            ))}
          </div>
        </div>

        {/* Empty state */}
        {totalFiltered === 0 && search && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No websites found matching "{search}"</p>
            {data?.ai_extraction_available && (
              <p className="text-sm text-muted-foreground mt-2">
                You can still try importing - AI extraction may work for this site
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
