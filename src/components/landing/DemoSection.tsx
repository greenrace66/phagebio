
import MoleculeViewer from "@/components/molecule/MoleculeViewer";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const DemoSection = () => {
  return (
    <section className="py-16 md:py-24">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center text-center space-y-4 mb-12">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            See BioStruct in Action
          </h2>
          <p className="max-w-[600px] text-muted-foreground text-lg">
            Experience the power of our intuitive visualization and analysis tools.
          </p>
        </div>
        
        <Tabs defaultValue="viewer" className="w-full">
          <div className="flex justify-center mb-6">
            <TabsList>
              <TabsTrigger value="viewer">Molecular Viewer</TabsTrigger>
              <TabsTrigger value="docking">Molecular Docking</TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="viewer">
            <Card className="border shadow-lg overflow-hidden">
              <div className="h-[500px]">
                <MoleculeViewer />
              </div>
            </Card>
          </TabsContent>
          
          <TabsContent value="docking">
            <Card className="border shadow-lg overflow-hidden p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-xl font-semibold mb-4">Sample Complex</h3>
                  <p className="text-muted-foreground mb-4">
                    View this example of a protein-ligand complex.
                  </p>
                  
                  <div className="space-y-4 mt-6">
                    <div className="border rounded-md p-3 bg-muted/30 text-sm">
                      <p>PDB ID: 1AK4</p>
                      <p>Beta-Trypsin Complex</p>
                      <p>with Benzamidine</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-black/5 rounded-lg overflow-hidden">
                  <MoleculeViewer 
                    initialPdbId="1AK4"
                    initialStyle="licorice"
                    initialColor="chainname"
                  />
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
};

export default DemoSection;
