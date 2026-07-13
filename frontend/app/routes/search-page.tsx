import {Button, Card} from "flowbite-react";


export default function SearchPage() {
    return (
        <>
            <h1 className={"text-center m-4 text-5xl"}>search page</h1>
            <form className="max-w-md mx-auto">
                <label htmlFor="search"
                       className="block mb-2.5 text-sm font-medium text-heading sr-only ">Search</label>
                <div className="relative">
                    <div className="absolute inset-y-0 flex items-center ps-3 pointer-events-none">
                        <svg className="w-4 h-4 text-body" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"
                             width="24" height="24" fill="none" viewBox="0 0 24 24">
                            <path stroke="currentColor" stroke-linecap="round" stroke-width="2"
                                  d="m21 21-3.5-3.5M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"/>
                        </svg>
                    </div>
                    <input type="search" id="search"
                           className="block w-full p-3 ps-9 bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand shadow-xs placeholder:text-body"
                           placeholder="Search" required/>
                    <button type="button"
                            className="absolute end-1.5 bottom-1.5 text-white bg-brand hover:bg-brand-strong box-border border border-transparent focus:ring-4 focus:ring-brand-medium shadow-xs font-medium leading-5 rounded text-xs px-3 py-1.5 focus:outline-none">Search
                    </button>
                </div>
            </form>
            {/*//Coffee shop card*/}
            <div className={"grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2"}>
                <Card className="max-w-sm m-4 p-6 border-black">
                    <div className={"flex justify-end"}>
                        <Button className={'bg-slate-300 text-black'} size="xs">Save</Button>
                    </div>
                    <h5 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white text-center">
                        Coffeeshop Name
                    </h5>
                    <div>
                        <img src="/coffeeshop-placeholder.png" alt="coffee shop"/>
                    </div>
                    <p className="font-normal text-center">
                        Coffeeshop tags/categories
                    </p>
                    <Button className={"bg-slate-300 text-black"}>
                        View Details
                        <svg className="ml-2 h-4 w-4" fill="black" viewBox="0 0 20 20"
                             xmlns="http://www.w3.org/2000/svg">
                            <path
                                fillRule="evenodd"
                                d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                                clipRule="evenodd"
                            />
                        </svg>
                    </Button>
                </Card>
                <Card className="max-w-sm m-4 p-6 border-black">
                    <div className={"flex justify-end"}>
                        <Button className={'bg-slate-300 text-black'} size="xs">Save</Button>
                    </div>
                    <h5 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white text-center">
                        Coffeeshop Name
                    </h5>
                    <div>
                        <img src="/coffeeshop-placeholder.png" alt="coffee shop"/>
                    </div>
                    <p className="font-normal text-center">
                        Coffeeshop tags/categories
                    </p>
                    <Button className={"bg-slate-300 text-black"}>
                        View Details
                        <svg className="ml-2 h-4 w-4" fill="black" viewBox="0 0 20 20"
                             xmlns="http://www.w3.org/2000/svg">
                            <path
                                fillRule="evenodd"
                                d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                                clipRule="evenodd"
                            />
                        </svg>
                    </Button>
                </Card>
                <Card className="max-w-sm m-4 p-6 border-black">
                    <div className={"flex justify-end"}>
                        <Button className={'bg-slate-300 text-black'} size="xs">Save</Button>
                    </div>
                    <h5 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white text-center">
                        Coffeeshop Name
                    </h5>
                    <div>
                        <img src="/coffeeshop-placeholder.png" alt="coffee shop"/>
                    </div>
                    <p className="font-normal text-center">
                        Coffeeshop tags/categories
                    </p>
                    <Button className={"bg-slate-300 text-black"}>
                        View Details
                        <svg className="ml-2 h-4 w-4" fill="black" viewBox="0 0 20 20"
                             xmlns="http://www.w3.org/2000/svg">
                            <path
                                fillRule="evenodd"
                                d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                                clipRule="evenodd"
                            />
                        </svg>
                    </Button>
                </Card>
                <Card className="max-w-sm m-4 p-6 border-black">
                    <div className={"flex justify-end"}>
                        <Button className={'bg-slate-300 text-black'} size="xs">Save</Button>
                    </div>
                    <h5 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white text-center">
                        Coffeeshop Name
                    </h5>
                    <div>
                        <img src="/coffeeshop-placeholder.png" alt="coffee shop"/>
                    </div>
                    <p className="font-normal text-center">
                        Coffeeshop tags/categories
                    </p>
                    <Button className={"bg-slate-300 text-black"}>
                        View Details
                        <svg className="ml-2 h-4 w-4" fill="black" viewBox="0 0 20 20"
                             xmlns="http://www.w3.org/2000/svg">
                            <path
                                fillRule="evenodd"
                                d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                                clipRule="evenodd"
                            />
                        </svg>
                    </Button>
                </Card>
            </div>
        </>
    )
}
