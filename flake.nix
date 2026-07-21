{
  description = "Mathetower GPT6 Graph Visualizer";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = { self, nixpkgs }:
    let
      system = "x86_64-linux";
      pkgs = import nixpkgs { inherit system; };
    in {
      devShells.${system}.default = pkgs.mkShell {
        packages = with pkgs; [
          (python3.withPackages (ps:
            let
              fa2 = ps.buildPythonPackage rec {
                pname = "fa2";
                version = "0.9.1";
                pyproject = true;

                src = ps.fetchPypi {
                  inherit pname version;
                  hash = "sha256-VteaDoSw/sGNLnmNY6evzfB2xKPrqIECx7I1+HS7B6k=";
                };

                nativeBuildInputs = with ps; [
                  setuptools
                  wheel
                  cython
                ];

                propagatedBuildInputs = with ps; [
                  numpy
                  scipy
                  tqdm
                ];
              };
            in
            with ps; [
              python-dotenv
              gunicorn
              flask
              requests
              zstandard
              pyqtgraph
              pyside6
              igraph
              numpy
              scipy
              fa2
              tqdm
            ]
          ))

          (vscode-with-extensions.override {
            vscode = vscodium;
            vscodeExtensions = [
              pkgs.vscode-extensions.jnoortheen.nix-ide
              pkgs.vscode-extensions.arrterian.nix-env-selector
              pkgs.vscode-extensions.mkhl.direnv
              pkgs.vscode-extensions.esbenp.prettier-vscode
              pkgs.vscode-extensions.ms-python.python
              pkgs.vscode-extensions.ms-python.debugpy
              pkgs.vscode-extensions.ms-python.vscode-python-envs
              pkgs.vscode-extensions.ms-python.black-formatter
            ];
          })
        ];
      };
    };
}
