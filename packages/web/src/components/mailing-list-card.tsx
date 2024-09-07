import { useState } from 'react';
import { X, Mailbox } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { subscribeToMailingList } from '@/lib/server';
import { useSettings } from '@/components/use-settings';

export default function MailingListCard() {
  const { subscriptionEmail, updateConfig } = useSettings();
  const [isVisible, setIsVisible] = useState(!subscriptionEmail);
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleClose = async () => {
    await updateConfig({ subscriptionEmail: 'dismissed' });
    setIsVisible(false);
  };

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    try {
      const response = await subscribeToMailingList(email);
      if (response.success) {
        setSubscribed(true);
        await updateConfig({ subscriptionEmail: email });
        setTimeout(() => {
          setIsVisible(false);
        }, 3000);
      } else {
        toast.error('There was an error subscribing to the mailing list. Please try again later.');
      }
    } catch (error) {
      toast.error('There was an error subscribing to the mailing list. Please try again later.');
      console.error('Subscription error:', error);
    }
  };

  if (!isVisible) return null;

  return (
    <Card className="fixed bottom-6 left-6 w-[460px] shadow-lg z-30">
      <div className="relative">
        <button
          className="absolute top-2 right-2 hover:bg-muted p-1 rounded-sm"
          onClick={handleClose}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
        <CardContent className="p-6">
          <div className="flex flex-col gap-2">
            <Mailbox size={24} />
            {subscribed ? (
              <>
                <h1 className="mt-2 text-lg font-medium">Thank you for subscribing!</h1>
                <p>We'll keep you updated with the latest news and features.</p>
              </>
            ) : (
              <>
                <h1 className="mt-2 text-lg font-medium">Join our mailing list!</h1>
                <p className="">
                  Get the latest updates, early access features, and expert tips delivered to your
                  inbox.
                </p>
                <form onSubmit={handleSubmit} className="flex gap-1 py-3">
                  <Input
                    type="email"
                    placeholder="Email"
                    className=""
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <Button type="submit">Subscribe</Button>
                </form>
              </>
            )}
          </div>
        </CardContent>
      </div>
    </Card>
  );
}
