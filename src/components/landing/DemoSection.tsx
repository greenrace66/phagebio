
import DemoMoleculeViewer from "@/components/molecule/DemoMoleculeViewer";
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
          <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 mb-6 gap-2">
            <TabsTrigger value="viewer" className="px-2 py-1 text-xs sm:px-3 sm:py-1.5 sm:text-sm">
              Molecular Viewer
            </TabsTrigger>
            <TabsTrigger value="docking" className="px-2 py-1 text-xs sm:px-3 sm:py-1.5 sm:text-sm">
              Molecular Docking
            </TabsTrigger>
            <TabsTrigger value="prediction" className="px-2 py-1 text-xs sm:px-3 sm:py-1.5 sm:text-sm">
              Structure Prediction
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="viewer">
            <Card className="border shadow-lg overflow-hidden">
              <div className="h-[500px]">
                <DemoMoleculeViewer 
                  initialPdbId="1CRN" 
                  viewType="standard"
                />
              </div>
            </Card>
          </TabsContent>
          
          <TabsContent value="docking">
            <Card className="border shadow-lg overflow-hidden">
              <div className="h-[500px]">
                <DemoMoleculeViewer
                  initialPdbId="1g74"
                  initialStyle="cartoon"
                  initialColor="chain-id"
                  focusLigand
                  viewType="docking"
                />
              </div>
            </Card>
          </TabsContent>
          
          <TabsContent value="prediction">
            <Card className="border shadow-lg overflow-hidden">
              <div className="h-[500px]">
                <DemoMoleculeViewer 
                  initialPdbId="AF-P01308-F1"
                  initialStyle="cartoon"
                  initialColor="bfactor"
                  viewType="prediction"
                />
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
};

export default DemoSection;
