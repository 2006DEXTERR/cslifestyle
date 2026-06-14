'use client';

import * as React from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, AlertCircle, MailCheck } from 'lucide-react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { BrandButton } from '@/components/ui/brand-button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { authApi, AuthApiError } from '@/lib/auth';

const schema = z.object({ email: z.string().email('Enter a valid email address') });
type Values = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [sent, setSent] = React.useState(false);
  const [devResetLink, setDevResetLink] = React.useState<string | null>(null);

  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: '' } });

  async function onSubmit(values: Values) {
    setServerError(null);
    try {
      const res = await authApi.forgotPassword(values.email);
      setSent(true);
      // Dev convenience: the API returns the token outside production.
      if (res.devResetToken) setDevResetLink(`/reset-password?token=${res.devResetToken}`);
    } catch (err) {
      setServerError(err instanceof AuthApiError ? err.message : 'Something went wrong. Please try again.');
    }
  }

  return (
    <div className="container mx-auto flex min-h-[70vh] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">Reset your password</CardTitle>
          <CardDescription>
            Enter your email and we&apos;ll send you a link to reset your password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-gradient">
                <MailCheck className="h-6 w-6 text-white" />
              </div>
              <p className="text-sm text-muted-foreground">
                If an account exists for that email, a reset link is on its way.
              </p>
              {devResetLink && (
                <Link href={devResetLink} className="block text-sm font-medium text-brand-pink hover:underline">
                  Dev: open reset link →
                </Link>
              )}
            </div>
          ) : (
            <>
              {serverError && (
                <div className="mb-4 flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{serverError}</span>
                </div>
              )}
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="you@example.com" autoComplete="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <BrandButton type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Send reset link
                  </BrandButton>
                </form>
              </Form>
            </>
          )}
          <p className="mt-6 text-center text-sm text-muted-foreground">
            <Link href="/login" className="font-medium text-brand-pink hover:underline">
              Back to sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
