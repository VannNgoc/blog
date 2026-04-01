"use client";

import { useForm, SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const schema = z.object({
  email: z.email("Please enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type FormFields = z.infer<typeof schema>;

export default function LoginPage() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormFields>({
    resolver: zodResolver(schema),
  });

  const onSubmit: SubmitHandler<FormFields> = (data) => console.log(data);
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <label htmlFor="email">Email</label>
      <br />
      <input
        id="email"
        className="border-2 border-solid"
        type="email"
        placeholder="you@example.com"
        {...register("email")}
      />
      {errors.email && <span className="text-red-500">{errors.email.message}</span>}
      <br />
      <label htmlFor="password">Password</label>
      <br />
      <input
        id="password"
        className="border-2 border-solid"
        type="password"
        {...register("password")}
      />
      {errors.password && <span className="text-red-500">{errors.password.message}</span>}
      <br />
      <input className="btn" type="submit" />
      <br />
    </form>
  );
}