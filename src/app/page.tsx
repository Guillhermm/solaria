import { Container } from "@/components/Container";
import SectionDivider from "@/components/SectionDivider";
import DeepViewer from "@/components/tools/DeepViewer";
import { getContent } from "@/content/load";
import { resolveTileBase } from "@/content/tiles";
import styles from "./page.module.css";

const Home = () => {
  const image = getContent().images.find((i) => i.id === "andromeda-phat-phast-2025");
  if (!image) throw new Error("data/images/andromeda-phat-phast-2025.json is missing");

  const tileBaseUrl = resolveTileBase(process.env.TILE_BASE_URL);

  return (
    <Container>
      <h1 className={styles.title}>NASA 2025 Solaria</h1>
      <h2 className={styles.subtitle}>Explore the Universe in Unprecedented Detail</h2>
      <p className={styles.intro}>
        NASA{`\’`}s space missions produce some of the largest and most detailed
        images ever captured, far beyond what your screen, or even your eyes,
        can take in at once. With Solaria, you can explore, zoom,
        compare, and analyze these ultra-high-resolution images in different ways.
      </p>
      <SectionDivider />
      <DeepViewer title="1. Deep Viewer" image={image} tileBaseUrl={tileBaseUrl} />
    </Container>
  );
};

export default Home;
