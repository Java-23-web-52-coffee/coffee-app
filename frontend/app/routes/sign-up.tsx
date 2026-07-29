import {Form, Link, useActionData} from "react-router";

import {Mail, Lock, User, Eye, EyeOff} from "lucide-react";
import {useState} from "react";
import type {Route} from "./+types/sign-up";
import {zodResolver} from '@hookform/resolvers/zod'
import type {FormActionResponse} from "~/utils/interfaces/FormActionResponse";
import {getValidatedFormData, useRemixForm} from "remix-hook-form";
import {postSignUp, type SignUp, SignUpSchema} from "~/utils/models/profile.model";
import {StatusMessage} from "~/components/StatusMessage";
import {FieldError} from "~/components/FieldError";


export function meta({}: Route.MetaArgs) {
    return [
        {title: "Sign Up"},
        {name: "description", content: "Sign up for an account."}
    ];
}

const resolver = zodResolver(SignUpSchema)

export async function action( {request} :Route.ActionArgs): Promise<FormActionResponse> {
    const {errors, data, receivedValues:defaultValues} = await getValidatedFormData<SignUp>(request, resolver)
    if(errors) {
        return{ errors, defaultValues}
    }

    try {
        const response = await postSignUp(data)

        if (response.status !== 200) {
            return {success: false, status: response}
        }

        return {success: true, status: response}
    } catch (error) {
        console.error('unexpected error during sig-up')
        return {success: false, status: {status: 500, data: null, message: 'Something went wrong. Try again'}}
    }
}

export default function SignUp() {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const {
        handleSubmit,
        formState: {errors},
        register
    } = useRemixForm<SignUp>({mode:'onSubmit', resolver})
    const actionData = useActionData<typeof action>();

    return (


        <>
            <div className="max-w-md mx-auto border border-gray-200 bg-white p-6  w-250 mt-20 rounded-xl shadow-md">
            <Form onSubmit={handleSubmit}  noValidate={true} method={'POST'}>

                {/*email field*/}
                <div className="max-w-md mx-auto p-6 bg-white rounded-xl shadow-md border border-gray-200 space-y-4 ">

                    <label
                        htmlFor="email"
                        className="block text-sm font-medium text-gray-900 mb-2">
                        <Mail className="h-5 w-5 text-gray-400 inline mr-4" />
                         Email
                    </label>

                <input className="w-full rounded-md border border-gray-400 px-3 py-2"
                    type="email"
                    id="email"
                    placeholder="Enter email"
                    {...register("email")}
                />

                <FieldError error={errors} field={'email'} />
                </div>

                {/*name field*/}
                <div className="max-w-md mx-auto p-6 bg-white rounded-xl shadow-md border border-gray-200 space-y-4">
                    <label
                        htmlFor="name"
                        className="block text-sm font-medium text-gray-900 mb-2">
                        <User className="h-5 w-5 text-gray-400 inline mr-4" />
                        Name
                    </label>
                <input className="w-full rounded-md border border-gray-400 px-3 py-2"
                    type="text"
                    id="name"
                    placeholder="Enter name"
                    {...register("name")}
                />
                <FieldError error={errors} field={'name'} />
                </div>

                {/*password field*/}
                <div className="max-w-md mx-auto p-6 bg-white rounded-xl shadow-md border border-gray-200 space-y-4 relative">
                    <div className="relative">
                        <label
                            htmlFor="name"
                            className="block text-sm font-medium text-gray-900 mb-2">

                            Password
                        </label>
                <input className="w-full rounded-md border border-gray-400 px-3 py-2"
                    type={showPassword ? "text" : "password"}
                    id="password"
                    placeholder="Enter password"
                    {...register("password")}
                />
                <button type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2">

                    {showPassword ? (
                        <EyeOff className="h-5 w-5 text-gray-500"/>
                    ) : (
                        <Eye className="h-5 w-5 text-gray-500"/>
                    )}
                </button>
                </div>
                <FieldError error={errors} field={'password'} />

                </div>

                {/*confirm password field*/}
                <div className="max-w-md mx-auto p-6 bg-white rounded-xl shadow-md border border-gray-200 space-y-4">
                    <div className="relative">
                        <label
                            htmlFor="passwordConfirm"
                            className="block text-sm font-medium text-gray-900 mb-2">
                            <Lock className="h-5 w-5 text-gray-400 mr-4 inline " />

                            Confirm Password
                        </label>
                <input className="w-full rounded-md border border-gray-400 px-3 py-2"
                    type={showConfirmPassword ? "text" : "password"}
                    id="passwordConfirm"
                    placeholder="Confirm password"
                    {...register("passwordConfirm")}
                />
                <button type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2">
                    {showConfirmPassword ? (
                        <EyeOff className="h-5 w-5 text-gray-500"/>
                    ) : (
                        <Eye className="h-5 w-5 text-gray-500"/>
                    )}
                </button>
                    </div>
                <FieldError error={errors} field={'passwordConfirm'} />
                </div>

                {/*submit button*/}

                <button
                    type="submit"
                    className="mx-auto block rounded-md bg-blue-600 px-6 py-2 mt-5 text-white hover:bg-blue-700 transition"
                >
                    Sign up
                </button>
                <StatusMessage actionData={actionData} />

                {/*sign in link*/}
                <Link
                    to="/sign-in"
                >
                    Already have an account? Sign in
                </Link>

            </Form>


            </div>

        </>
    );
}