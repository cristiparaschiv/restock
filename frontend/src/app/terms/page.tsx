'use client';

import Link from 'next/link';
import { Header } from '@/components/header';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function TermsOfServicePage() {
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
          <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
          <p className="text-muted-foreground mb-8">Last updated: January 2025</p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground mb-4">
              By accessing or using Restok, you agree to be bound by these Terms of Service. If you do not
              agree to these terms, please do not use our service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">2. Description of Service</h2>
            <p className="text-muted-foreground mb-4">
              Restok is a recipe management application that allows you to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground mb-4 space-y-1">
              <li>Import recipes from websites</li>
              <li>Create and organize your own recipes</li>
              <li>Plan weekly meals</li>
              <li>Generate shopping lists</li>
              <li>Access recipes in multiple languages</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">3. User Accounts</h2>
            <p className="text-muted-foreground mb-4">
              To use Restok, you must create an account. You are responsible for:
            </p>
            <ul className="list-disc list-inside text-muted-foreground mb-4 space-y-1">
              <li>Providing accurate account information</li>
              <li>Maintaining the security of your password</li>
              <li>All activities that occur under your account</li>
              <li>Notifying us immediately of any unauthorized use</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">4. Acceptable Use</h2>
            <p className="text-muted-foreground mb-4">You agree not to:</p>
            <ul className="list-disc list-inside text-muted-foreground mb-4 space-y-1">
              <li>Use the service for any illegal purpose</li>
              <li>Attempt to gain unauthorized access to the service</li>
              <li>Interfere with or disrupt the service</li>
              <li>Upload malicious content or code</li>
              <li>Scrape or collect data from other users</li>
              <li>Use the service to spam or harass others</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">5. Recipe Content</h2>
            <p className="text-muted-foreground mb-4">
              When you import recipes from external websites:
            </p>
            <ul className="list-disc list-inside text-muted-foreground mb-4 space-y-1">
              <li>You are responsible for ensuring you have the right to use that content</li>
              <li>Imported recipes are for your personal use only</li>
              <li>We do not claim ownership of recipes you import or create</li>
              <li>Original recipe authors retain their copyrights</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">6. Browser Extension</h2>
            <p className="text-muted-foreground mb-4">
              The Restok browser extension:
            </p>
            <ul className="list-disc list-inside text-muted-foreground mb-4 space-y-1">
              <li>Only activates on pages you explicitly choose to import from</li>
              <li>Stores authentication data locally in your browser</li>
              <li>Communicates only with your configured Restok server</li>
              <li>Does not track your browsing activity</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">7. Intellectual Property</h2>
            <p className="text-muted-foreground mb-4">
              The Restok application, including its design, code, and branding, is protected by intellectual
              property laws. You may not copy, modify, distribute, or reverse engineer any part of the service
              without our permission.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">8. Service Availability</h2>
            <p className="text-muted-foreground mb-4">
              We strive to maintain high availability but do not guarantee uninterrupted service. We may:
            </p>
            <ul className="list-disc list-inside text-muted-foreground mb-4 space-y-1">
              <li>Perform maintenance that temporarily affects availability</li>
              <li>Modify or discontinue features with reasonable notice</li>
              <li>Suspend accounts that violate these terms</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">9. Limitation of Liability</h2>
            <p className="text-muted-foreground mb-4">
              Restok is provided &ldquo;as is&rdquo; without warranties of any kind. We are not liable for:
            </p>
            <ul className="list-disc list-inside text-muted-foreground mb-4 space-y-1">
              <li>Loss of data or service interruptions</li>
              <li>Accuracy of imported recipe information</li>
              <li>Any damages arising from use of the service</li>
              <li>Actions of third-party websites you import from</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">10. Account Termination</h2>
            <p className="text-muted-foreground mb-4">
              You may delete your account at any time. We may terminate or suspend your account if you violate
              these terms. Upon termination, your data will be deleted in accordance with our Privacy Policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">11. Changes to Terms</h2>
            <p className="text-muted-foreground mb-4">
              We may update these terms from time to time. Continued use of the service after changes
              constitutes acceptance of the new terms. We will notify users of significant changes.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">12. Governing Law</h2>
            <p className="text-muted-foreground mb-4">
              These terms are governed by applicable laws. Any disputes will be resolved through appropriate
              legal channels.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">13. Contact</h2>
            <p className="text-muted-foreground mb-4">
              If you have questions about these Terms of Service, please contact us through the application.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
