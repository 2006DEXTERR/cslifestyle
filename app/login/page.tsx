'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, AlertCircle, ShieldCheck } from 'lucide-react';
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

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});
type Values = z.infer<typeof schema>;

const codeSchema = z.object({ code: z.string().min(6, 'Enter your 6-digit or backup code') });
type CodeValues = z.infer<typeof codeSchema>;

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="mb-4 flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
      <AlertCircle className="h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const redirectTo = params.get('redirect') || '/';
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [challenge, setChallenge] = React.useState<string | null>(null);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });
  const codeForm = useForm<CodeValues>({
    resolver: zodResolver(codeSchema),
    defaultValues: { code: '' },
  });

  function finish() {
    router.push(redirectTo);
    router.refresh();
  }

  async function onSubmit(values: Values) {
    setServerError(null);
    try {
      const res = await authApi.login(values);
      if ('twoFactorRequired' in res) {
        setChallenge(res.challenge);
      } else {
        finish();
      }
    } catch (err) {
      setServerError(err instanceof AuthApiError ? err.message : 'Something went wrong. Please try again.');
    }
  }

  async function onSubmitCode(values: CodeValues) {
    setServerError(null);
    try {
      await authApi.loginTwoFactor(challenge!, values.code);
      finish();
    } catch (err) {
      setServerError(err instanceof AuthApiError ? err.message : 'Something went wrong. Please try again.');
    }
  }

  return (
    <div className="container mx-auto flex min-h-[70vh] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        {challenge ? (
          <>
            <CardHeader className="space-y-1 text-center">
              <ShieldCheck className="mx-auto h-8 w-8 text-brand-pink" />
              <CardTitle className="text-2xl font-bold">Two-factor authentication</CardTitle>
              <CardDescription>Enter the 6-digit code from your authenticator app, or a backup code.</CardDescription>
            </CardHeader>
            <CardContent>
              {serverError && <ErrorBox message={serverError} />}
              <Form {...codeForm}>
                <form onSubmit={codeForm.handleSubmit(onSubmitCode)} className="space-y-4">
                  <FormField
                    control={codeForm.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Authentication code</FormLabel>
                        <FormControl>
                          <Input
                            inputMode="text"
                            autoComplete="one-time-code"
                            placeholder="123456"
                            autoFocus
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <BrandButton type="submit" className="w-full" disabled={codeForm.formState.isSubmitting}>
                    {codeForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Verify
                  </BrandButton>
                </form>
              </Form>
              <button
                type="button"
                onClick={() => {
                  setChallenge(null);
                  setServerError(null);
                }}
                className="mt-6 w-full text-center text-sm text-muted-foreground hover:underline"
              >
                Back to sign in
              </button>
            </CardContent>
          </>
        ) : (
          <>
            <CardHeader className="space-y-1 text-center">
              <CardTitle className="text-2xl font-bold">
                Sign in to{' '}
                <span className="bg-brand-gradient bg-clip-text text-transparent">CSLifestyle</span>
              </CardTitle>
              <CardDescription>Welcome back. Enter your details to continue.</CardDescription>
            </CardHeader>
            <CardContent>
              {serverError && <ErrorBox message={serverError} />}
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
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel>Password</FormLabel>
                          <Link href="/forgot-password" className="text-xs font-medium text-brand-pink hover:underline">
                            Forgot password?
                          </Link>
                        </div>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" autoComplete="current-password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <BrandButton type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sign in
                  </BrandButton>
                </form>
              </Form>
              <p className="mt-6 text-center text-sm text-muted-foreground">
                Don&apos;t have an account?{' '}
                <Link href="/signup" className="font-medium text-brand-pink hover:underline">
                  Create one
                </Link>
              </p>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense fallback={null}>
      <LoginInner />
    </React.Suspense>
  );
}
