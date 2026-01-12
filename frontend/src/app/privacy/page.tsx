'use client';

import Link from 'next/link';
import { Header } from '@/components/header';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-muted/30">
      <Header />
      <main className="container py-8 px-6 md:px-8 max-w-4xl mx-auto">
        <Button variant="ghost" size="sm" asChild className="mb-6 -ml-2 text-muted-foreground hover:text-foreground">
          <Link href="/">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Home
          </Link>
        </Button>

        <div className="prose prose-neutral dark:prose-invert max-w-none">
          <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
          <p className="text-muted-foreground mb-8">Last updated: January 2025</p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">1. Introduction</h2>
            <p className="text-muted-foreground mb-4">
              Welcome to Restok. We respect your privacy and are committed to protecting your personal data.
              This privacy policy explains how we collect, use, and safeguard your information when you use our
              recipe management application and browser extension.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">2. Information We Collect</h2>
            <h3 className="text-lg font-medium mb-2">Account Information</h3>
            <ul className="list-disc list-inside text-muted-foreground mb-4 space-y-1">
              <li>Email address (for account creation and login)</li>
              <li>Password (stored securely using industry-standard hashing)</li>
              <li>Language preference</li>
            </ul>

            <h3 className="text-lg font-medium mb-2">Recipe Data</h3>
            <ul className="list-disc list-inside text-muted-foreground mb-4 space-y-1">
              <li>Recipes you import or create</li>
              <li>Meal plans and shopping lists</li>
              <li>Categories and favorites</li>
            </ul>

            <h3 className="text-lg font-medium mb-2">Browser Extension</h3>
            <ul className="list-disc list-inside text-muted-foreground mb-4 space-y-1">
              <li>Server URL you configure (stored locally in your browser)</li>
              <li>Authentication tokens (stored locally in your browser)</li>
              <li>Recipe content from web pages you choose to import</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">3. How We Use Your Information</h2>
            <ul className="list-disc list-inside text-muted-foreground mb-4 space-y-1">
              <li>To provide and maintain the Restok service</li>
              <li>To authenticate your account and secure your data</li>
              <li>To sync your recipes, meal plans, and shopping lists across devices</li>
              <li>To translate recipes between supported languages</li>
              <li>To generate shopping lists from your meal plans</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">4. Data Storage and Security</h2>
            <p className="text-muted-foreground mb-4">
              Your data is stored on secure servers. We use industry-standard security measures including:
            </p>
            <ul className="list-disc list-inside text-muted-foreground mb-4 space-y-1">
              <li>HTTPS encryption for all data transmission</li>
              <li>Secure password hashing (bcrypt)</li>
              <li>JWT-based authentication with token expiration</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">5. Data Sharing</h2>
            <p className="text-muted-foreground mb-4">
              We do not sell, trade, or share your personal information with third parties, except:
            </p>
            <ul className="list-disc list-inside text-muted-foreground mb-4 space-y-1">
              <li>When required by law or legal process</li>
              <li>To protect our rights or the safety of users</li>
              <li>With your explicit consent</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">6. Third-Party Services</h2>
            <p className="text-muted-foreground mb-4">
              Our service may interact with third-party websites when you import recipes. We only read
              publicly available recipe content from pages you explicitly choose to import. We do not
              track your browsing activity.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">7. Your Rights</h2>
            <p className="text-muted-foreground mb-4">You have the right to:</p>
            <ul className="list-disc list-inside text-muted-foreground mb-4 space-y-1">
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Delete your account and associated data</li>
              <li>Export your recipe data</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">8. Cookies and Local Storage</h2>
            <p className="text-muted-foreground mb-4">
              We use local storage to maintain your authentication session. The browser extension stores
              your server configuration and authentication tokens locally in your browser. No tracking
              cookies are used.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">9. Changes to This Policy</h2>
            <p className="text-muted-foreground mb-4">
              We may update this privacy policy from time to time. We will notify you of any changes by
              posting the new policy on this page and updating the &ldquo;Last updated&rdquo; date.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">10. Contact Us</h2>
            <p className="text-muted-foreground mb-4">
              If you have any questions about this Privacy Policy, please contact us through the application.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
