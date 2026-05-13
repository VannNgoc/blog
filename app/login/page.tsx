"use client";

import {
  loginFormSchema,
  type LoginFormFields,
} from "@/schemas/login";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

export default function LoginPage() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormFields>({
    resolver: zodResolver(loginFormSchema),
  });

  const onSubmit: SubmitHandler<LoginFormFields> = (data) => console.log(data);
  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="container mx-auto max-w-md space-y-4 p-4 text-zinc-900 dark:text-zinc-50"
    >
      <label htmlFor="email" className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">
        Email
      </label>
      <input
        id="email"
        className="w-full rounded-md border-2 border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder:text-zinc-500 focus:border-blue-600 focus:outline-none dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder:text-zinc-400 dark:focus:border-blue-500"
        type="email"
        placeholder="you@example.com"
        {...register("email")}
      />
      {errors.email && (
        <span className="text-sm text-red-600 dark:text-red-400" role="alert">
          {errors.email.message}
        </span>
      )}
      <label htmlFor="password" className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">
        Password
      </label>
      <input
        id="password"
        className="w-full rounded-md border-2 border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:border-blue-600 focus:outline-none dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-blue-500"
        type="password"
        {...register("password")}
      />
      {errors.password && (
        <span className="text-sm text-red-600 dark:text-red-400" role="alert">
          {errors.password.message}
        </span>
      )}
      <input className="btn" type="submit" />
    </form>
  );
}