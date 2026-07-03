import { Controller, Get } from "@nestjs/common";
import { PetService } from "./pet.service";

@Controller("pet")

export class PetController{

    constructor(private readonly petService:PetService){}

    @Get()

    getAllPets(){

        return this.petService.getAllPets();

    }

}