
import DemoMoleculeViewer from "@/components/molecule/DemoMoleculeViewer";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";

const DemoSection = () => {
  const isMobile = useIsMobile();
  
  return (
    <section className="py-12 md:py-16 lg:py-24">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center text-center space-y-4 mb-8 md:mb-12">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl lg:text-4xl">
            See BioStruct in Action
          </h2>
          <p className="max-w-[600px] text-muted-foreground text-sm md:text-lg">
            Experience the power of our intuitive visualization and analysis tools.
          </p>
        </div>
        
        <Tabs defaultValue="viewer" className="w-full">
          <div className="flex justify-center mb-6 overflow-x-auto scrollbar-none pb-2">
            <TabsList>
              <TabsTrigger value="viewer" className="text-xs md:text-sm">Molecular Viewer</TabsTrigger>
              <TabsTrigger value="docking" className="text-xs md:text-sm">Molecular Docking</TabsTrigger>
              <TabsTrigger value="prediction" className="text-xs md:text-sm">Structure Prediction</TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="viewer">
            <Card className="border shadow-lg overflow-hidden">
              <div className="h-[350px] md:h-[500px]">
                <DemoMoleculeViewer initialPdbId="1CRN" hideInfoOnMobile={true} />
              </div>
            </Card>
          </TabsContent>
          
          <TabsContent value="docking">
            <Card className="border shadow-lg overflow-hidden p-4 md:p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg md:text-xl font-semibold mb-4">Sample Complex</h3>
                  <div className="space-y-4 mt-6">
                    <div className="border rounded-md p-3 bg-muted/30 text-xs md:text-sm">
                      <p>PDB ID: 1YVB</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-black/5 rounded-lg overflow-hidden h-[300px] md:h-[350px]">
                  <DemoMoleculeViewer
                    initialPdbId="1YVB"
                    initialStyle="Cartoon"
                    initialColor="chainname"
                    focusLigand
                    hideInfoOnMobile={true}
                  />
                </div>
              </div>
            </Card>
          </TabsContent>
          
          <TabsContent value="prediction">
            <Card className="border shadow-lg overflow-hidden p-4 md:p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg md:text-xl font-semibold mb-4">Structure Prediction</h3>
                  <p className="text-xs md:text-sm text-muted-foreground mb-4">
                    Visualize predicted protein structures colored by pLDDT confidence scores.
                  </p>
                  
                  <div className="space-y-4 mt-6">
                    <div className="border rounded-md p-3 bg-muted/30 text-xs md:text-sm">
                      <p>Sample predicted structure</p>
                      <p>Colored by confidence (pLDDT)</p>
                      <div className="mt-2 flex items-center">
                        <div className="w-full h-2 bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded"></div>
                      </div>
                      <div className="flex justify-between text-xs mt-1">
                        <span>Low confidence</span>
                        <span>High confidence</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-black/5 rounded-lg overflow-hidden h-[300px] md:h-[350px]">
                  <DemoMoleculeViewer 
                    initialPdbId="AF-P01308-F1"
                    initialStyle="cartoon"
                    initialColor="bfactor"
                    hideInfoOnMobile={true}
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
