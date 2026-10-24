"use client";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

const formSchema = z.object({
  bio: z.string().min(10, "Bio must be at least 10 characters long."),
  expertise: z.string().min(2, "Expertise must be at least 2 characters long."),
  hourlyRate: z.coerce.number().min(0, "Hourly rate cannot be negative."),
  availability: z.string().min(2, "Availability must be at least 2 characters long."),
  maxMentees: z.coerce.number().min(1, "Max mentees must be at least 1."),
});

import { MentorProfile } from '@prisma/client';

type FormValues = z.infer<typeof formSchema>;

export function MentorProfileForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [mentorProfile, setMentorProfile] = useState<MentorProfile | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues, any, FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      bio: "",
      expertise: "",
      hourlyRate: 0,
      availability: "",
      maxMentees: 1,
    },
  });

  useEffect(() => {
    const fetchProfileAndFinalizeOnboarding = async () => {
      try {
        const response = await fetch("/api/mentor-profile");
        if (response.ok) {
          const profile = await response.json();
          setMentorProfile(profile);
          const expertiseString = Array.isArray(profile.expertise) ? profile.expertise.join(', ') : '';
          form.reset({
            ...profile,
            expertise: expertiseString,
            hourlyRate: profile.hourlyRate ? profile.hourlyRate : 0,
          });

          const urlParams = new URLSearchParams(window.location.search);
          if (urlParams.get('onboarding') === 'complete' && !profile.stripeOnboardingComplete) {
            const finalizeResponse = await fetch('/api/stripe/finalize-onboarding', {
                method: 'POST',
            });
            if(finalizeResponse.ok) {
                const updatedProfile = await finalizeResponse.json();
                setMentorProfile(updatedProfile);
                toast({
                    title: "Success",
                    description: "Your Stripe account has been connected.",
                });
            } else {
                toast({
                    title: "Error",
                    description: "Failed to finalize Stripe onboarding.",
                    variant: "destructive",
                });
            }
          }
        }
      } catch (error) {
        console.error("Error in profile fetch/onboarding:", error);
      }
    };
    fetchProfileAndFinalizeOnboarding();
  }, [form, toast]);

  const handleStripeConnect = async () => {
    try {
        const response = await fetch('/api/stripe/connect', {
            method: 'POST',
        });
        if(response.ok) {
            const { url } = await response.json();
            router.push(url);
        } else {
            toast({
                title: "Error",
                description: "Failed to start Stripe onboarding.",
                variant: "destructive",
            });
        }
    } catch (error) {
        console.error("Stripe Connect error:", error);
        toast({
            title: "Error",
            description: "An unexpected error occurred.",
            variant: "destructive",
        });
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      const transformedValues = {
        ...values,
        expertise: values.expertise.split(',').map(s => s.trim()),
      };

      const response = await fetch("/api/mentor-profile", {
        method: mentorProfile ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(transformedValues),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: `Your mentor profile has been ${mentorProfile ? 'updated' : 'created'}.`,
        });
        if (!mentorProfile) {
            const newProfile = await response.json();
            setMentorProfile(newProfile);
        }
      } else {
        toast({
          title: "Error",
          description: `Failed to ${mentorProfile ? 'updatdee' : 'create'} mentor profile.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error(`Error ${mentorProfile ? 'updating' : 'creating'} mentor profile:`, error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bio</FormLabel>
              <FormControl>
                <Textarea placeholder="Tell us about yourself" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="expertise"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Expertise</FormLabel>
              <FormControl>
                <Input placeholder="e.g., React, Node.js, Design" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="hourlyRate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Hourly Rate (USD)</FormLabel>
              <FormControl>
                <Input type="number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="availability"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Availability</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Weekdays, 9am-5pm PST" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="maxMentees"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Max Mentees</FormLabel>
              <FormControl>
                <Input type="number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex space-x-4">
            <Button type="submit" disabled={isSubmitting}>{mentorProfile ? "Update Profile" : "Create Profile"}</Button>
            {mentorProfile && !mentorProfile.stripeOnboardingComplete && (
                <Button type="button" onClick={handleStripeConnect}>
                    Connect with Stripe
                </Button>
            )}
        </div>
      </form>
    </Form>
  );
}