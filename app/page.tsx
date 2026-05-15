import HomeClient from "@/components/HomeClient";

export default async function Page({
                                       searchParams,
                                   }: {
    searchParams: Promise<{ mappings?: string }>;
}) {

    const params = await searchParams;

    console.log('[Page] searchParams:', params);

    return (
        <HomeClient
            mappings={params.mappings ?? null}
        />
    );
}