# Tarrifs
An economics game where you defeat rivals through cunning rather than force.

Do note, this isn't gonna be a typical README, and it will be more along the lines of allowing me to dump my thoughts here.

# Gameplay Mechanics
## Cities and Production 
Cities produce things. Things can be sold. Selling things means that there's money to be made. There's not much else to it. You make a thing, you sell a thing, you get money. 

#### Cities
```
{ 
  
  producers: [ {{producer}, ...]
}
```

#### Producer
```
{
  // Recipies known to that craftsperson
  recipies = { ""key": {{recipe}, ... }
  stockpile = { ""key": **amount*, ... } 
  currentProjects = [ {{project}, ... ]
}
```

## Merchants
Extending on the idea of buying and selling things within a town, wouldn't it be better if you could move the items around, and sell them where they're more expensive, or buy them in cheaper places to get more money out of the mix.