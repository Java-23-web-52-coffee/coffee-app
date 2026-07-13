export default function experienceLog() {
    return (
<>
    <h1 className={"text-center m-4 text-5xl"}>Experience Log</h1>

    <div className={'bg-slate-300 p-7 mt-20 flex flex-col md:flex-row items-center gap-4'}>
        <img src="/coffeeshop-placeholder.png" alt="coffee shop" className={'w-full md:w-auto'}/>
        <div className={'bg-white p-6 sm:p-10 m-7 rounded-md shadow-md flex-1'}>
            <div className={'w-full flex flex-col md:flex-row items-start md:items-center justify-between gap-2'}>
                <ul className= {'text-sm md:text-base lg:text-lg'}>
                    <li>How was your experience with "Example Coffeeshop"?</li>
                    <li>Quiet? 1-5</li>
                    <li>Cozy? 1-5</li>
                    <li>Gluten-free? 1-5</li>
                </ul>
                </div>
        </div>
    </div>

</>
    )
}