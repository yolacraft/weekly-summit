import HomeClient from "@/components/HomeClient";

export default function Page({
                               searchParams,
                             }: {
  searchParams: { mappings?: string };
}) {
  return (
      <HomeClient
          mappings={searchParams.mappings ?? null}
      />
  );
}