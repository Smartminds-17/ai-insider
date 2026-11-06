"use client";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToastManager } from "@/components/ui/toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

const formSchema = z.object({
  bio: z.string().min(10, "Bio must be at least 10 characters long.").max(2000, "Bio must be 2000 characters or fewer."),
  expertise: z
    .string()
    .refine((value) => {
      const skills = value.split(",").map((skill) => skill.trim()).filter(Boolean);
      return skills.length > 0 && skills.length <= 20 && skills.every((skill) => skill.length <= 60);
    }, "Enter 1-20 comma-separated skills, each 60 characters or fewer."),
  hourlyRate: z.coerce.number<number>().min(0, "Hourly rate cannot be negative."),
  availability: z.boolean(),
  maxMentees: z.coerce.number<number>().int().min(1, "Max mentees must be at least 1.").max(50, "Max mentees cannot exceed 50."),
});

import { MentorProfile } from '@prisma/client';

type FormInput = z.input<typeof formSchema>;
type FormOutput = z.output<typeof formSchema>;

export function MentorProfileForm() {
  const router = useRouter();
  const toastManager = useToastManager();
  const [mentorProfile, setMentorProfile] = useState<MentorProfile | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      bio: "",
      expertise: "",
      hourlyRate: 0,
      availability: true,
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
                toastManager.add({
                    title: "Success",
                    description: "Your Stripe account has been connected.",
                    type: "success",
                });
            } else {
                toastManager.add({
                    title: "Error",
                    description: "Failed to finalize Stripe onboarding.",
                    type: "error",
                });
            }
          }
        }
      } catch (error) {
        console.error("Error in profile fetch/onboarding:", error);
      }
    };
    fetchProfileAndFinalizeOnboarding();
  }, [form, toastManager]);

  const handleStripeConnect = async () => {
    try {
        const response = await fetch('/api/stripe/connect', {
            method: 'POST',
        });
        if(response.ok) {
            const { url } = await response.json();
            router.push(url);
        } else {
            toastManager.add({
                title: "Error",
                description: "Failed to start Stripe onboarding.",
                type: "error",
            });
        }
    } catch (error) {
        console.error("Stripe Connect error:", error);
        toastManager.add({
            title: "Error",
            description: "An unexpected error occurred.",
            type: "error",
        });
    }
  };

  const onSubmit = async (values: FormOutput) => {
    setIsSubmitting(true);
    try {
      const transformedValues = {
        ...values,
        expertise: values.expertise.split(',').map((skill) => skill.trim()).filter(Boolean),
      };

      const response = await fetch("/api/mentor-profile", {
        method: mentorProfile ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(transformedValues),
      });

      if (response.ok) {
        toastManager.add({
          title: "Success",
          description: `Your mentor profile has been ${mentorProfile ? 'updated' : 'created'}.`,
          type: "success",
        });
        if (!mentorProfile) {
            const newProfile = await response.json();
            setMentorProfile(newProfile);
        }
      } else {
        toastManager.add({
          title: "Error",
          description: `Failed to ${mentorProfile ? 'update' : 'create'} mentor profile.`,
          type: "error",
        });
      }
    } catch (error) {
      console.error(`Error ${mentorProfile ? 'updating' : 'creating'} mentor profile:`, error);
      toastManager.add({
        title: "Error",
        description: "An unexpected error occurred.",
        type: "error",
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
            <FormItem className="flex flex-row items-center justify-between gap-4 rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel>Accepting mentees</FormLabel>
                <FormDescription>
                  Turn this off to hide your profile from the mentor directory.
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  onBlur={field.onBlur}
                  name={field.name}
                />
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