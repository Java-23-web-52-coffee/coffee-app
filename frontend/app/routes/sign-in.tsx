//imports
import {Eye, EyeOff, Lock, Mail} from "lucide-react";
import {zodResolver} from "@hookform/resolvers/zod";
import type {FormActionResponse} from "~/utils/interfaces/FormActionResponse";
import {getValidatedFormData, useRemixForm} from "remix-hook-form";
import {data, Form, Link, redirect, useActionData} from "react-router";
import {useState} from "react";
import {postSignIn, type SignIn} from "~/utils/models/sign-in.model";
import {FieldError} from "~/components/FieldError";
import {StatusMessage} from "~/components/StatusMessage";
import {SignInSchema} from "~/utils/models/sign-in.model";
import type {Route} from "./+types/sign-in";
import {commitSession, getSession} from "~/utils/session.server";
import {ProfileSchema} from "~/utils/models/profile.model";
import {jwtDecode} from "jwt-decode";

export function meta({}: Route.MetaArgs) {
    return [
        {title: "Sign In"},
        {name: "description", content: "Sign in to your account"}
    ];
}

const resolver = zodResolver(SignInSchema)

export async function action({request}: Route.ActionArgs): Promise<FormActionResponse | Response> {

    const session = await getSession(
        request.headers.get('Cookie')
    )

    const {errors, data, receivedValues: defaultValues} = await getValidatedFormData<SignIn>(request, resolver)

    if (errors) {
        return {errors, defaultValues}
    }
console.log("hello world")
    const {result, headers} = await postSignIn(data)

    const authorization = headers.get('authorization')

    const expressSessionCookie = headers.get('Set-Cookie')

    if (result.status !== 200 || !authorization) {
        return {success: false, status: result}
    }

    let parsedJwtToken: any
    try {
        parsedJwtToken = jwtDecode(authorization)
    } catch (error) {
        console.error('failed to decode authorization token:', error)
        return {success: false, status: {status: 400, data: null, message: 'sign in attempt failed try again'}}
    }

    // Validate the profile data carried in the JWT
    const validationResult = ProfileSchema.safeParse(parsedJwtToken.auth)

    // Handle invalid profile data
    if (!validationResult.success) {
        console.error('failed to parse authorization token:', validationResult.error)
        session.flash('error', 'profile is malformed')
        return {success: false, status: {status: 400, data: null, message: 'sign in attempt failed try again'}}
    }

    session.set('authorization', authorization)
    session.set('profile', validationResult.data)

    const responseHeaders = new Headers()
    responseHeaders.append('Set-Cookie', await commitSession(session))
    if (expressSessionCookie) {
        responseHeaders.append('Set-Cookie', expressSessionCookie)
    }
    return redirect('/preferences', {headers: responseHeaders})
}

export default function SignIn() {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const {
        handleSubmit,
        formState: {errors},
        register
    } = useRemixForm<SignIn>({mode: 'onSubmit', resolver})
    const actionData = useActionData<typeof action>();

    return (
        <>
            <div className="max-w-md mx-auto border border-gray-200 bg-white p-6  w-250 mt-20 rounded-xl shadow-md">
                <Form onSubmit={handleSubmit} noValidate={true} method={'POST'}>

                    {/*email field*/}
                    <div
                        className="max-w-md mx-auto p-6 bg-white rounded-xl shadow-md border border-gray-200 space-y-4 ">

                        <label
                            htmlFor="email"
                            className="block text-sm font-medium text-gray-900 mb-2">
                            <Mail className="h-5 w-5 text-gray-400 inline mr-4"/>
                            Email
                        </label>

                        <input className="w-full rounded-md border border-gray-400 px-3 py-2"
                               type="email"
                               id="email"
                               placeholder="Enter email"
                               {...register("email")}
                        />

                        <FieldError error={errors} field={'email'}/>
                    </div>

                    {/*password field*/}
                    <div
                        className="max-w-md mx-auto p-6 bg-white rounded-xl shadow-md border border-gray-200 space-y-4 mb-4">
                        <label
                            htmlFor="name"
                            className="block text-sm font-medium text-gray-900 mb-2">
                            <Lock className="h-5 w-5 text-gray-400 mr-4 inline "/>

                            Password
                        </label>
                        <div className="relative">

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
                        <FieldError error={errors} field={'password'}/>
                    </div>


                    {/*submit button*/}

                    <button
                        type="submit"
                        className="mx-auto block rounded-md bg-blue-600 px-6 py-2 mt-5 text-white hover:bg-blue-700 transition"
                    >
                        Sign in
                    </button>
                    <StatusMessage actionData={actionData}/>

                    {/*sign in link*/}
                    <Link
                        to="/sign-in"
                    >

                    </Link>

                </Form>


            </div>

        </>
    );
}




