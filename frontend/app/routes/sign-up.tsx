import {Link} from "react-router";
import {Mail, Lock, User, Eye, EyeOff} from "lucide-react";
import {useState} from "react";
import type {Route} from "./+types/sign-up";
import

export function meta({}: Route.MetaArgs) {
    return [
        {title: "Sign Up"},
        {names: "description", content: "Sign up for an account."}
    ];
}

const resolver = zodResolver(SignUpSchema)

export async function action( {request} :Route.ActionArgs): Promise<Route.ActionReturn> {
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

    return (

//email field
        <>
            <form>
                <input
                    type="email"
                    id="email"
                    name="email"
                    placeholder="Enter email"
                />

                {/*name field*/}

                <input
                    type="text"
                    id="name"
                    name="name"
                    placeholder="Enter name"
                />


                {/*password field*/}
                <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    placeholder="Enter password"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}>

                    {showPassword ? (
                        <EyeOff className="h-5 w-5 text-gray-500"/>
                    ) : (
                        <Eye className="h-5 w-5 text-gray-500"/>
                    )}
                </button>


                {/*confirm password field*/}
                <input
                    type={showConfirmPassword ? "text" : "password"}
                    id="confirmPassword"
                    name="confirmPassword"
                    placeholder="Confirm password"
                />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                    {showConfirmPassword ? (
                        <EyeOff className="h-5 w-5 text-gray-500"/>
                    ) : (
                        <Eye className="h-5 w-5 text-gray-500"/>
                    )}
                </button>

                {/*submit button*/}
                <button
                    type="submit"
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2"
                >
                    Sign up
                </button>
            </form>

            {/*sign in link*/}
            <Link
                to="/sign-in"
            >
                Already have an account? Sign in
            </Link>

        </>
    );
}