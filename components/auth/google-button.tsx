'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';

export function GoogleButton() {
  const t = useTranslations('auth');
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      isLoading={loading}
      onClick={handleClick}
      className="w-full"
    >
      {t('continueWithGoogle')}
    </Button>
  );
}
