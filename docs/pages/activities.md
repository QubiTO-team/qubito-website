# How to Add a New Activity

To contribute a new activity to the QubiTO Team website, follow these steps using the `content/activities/data/index.en.yaml` file as a reference.

## Steps

1. **Open the file:**  
   Edit `content/activities/data/index.en.yaml`.

2. **Add a new activity entry:**  
   Each activity is a YAML object (starting with `-`) with several properties.  
   Copy and modify an existing entry or create a new one at the top or bottom of the list.

3. **Fill in the properties:**  
   The main properties for each activity are:

   - `icon`: Emoji or icon representing the activity.
   - `header`: Title of the activity.
   - `badge`: Year or label for the activity.
   - `description`: Brief description of the activity.
   - `isMainActivity`: `true` if it's a main activity, `false` otherwise.
   - `images`: (optional) List of image paths related to the activity.
   - `link`: (optional)  
     - `url`: External link for more info.  
     - `text`: Text for the link button.

4. **Save and create a pull request:**  
   See the [Contribution Guide](../README.md) for details.

## Example

```yaml
- icon: "🧑‍🔬"
  header: "Quantum Workshop"
  badge: "2025"
  description: "Hands-on workshop introducing students to quantum programming and algorithms."
  isMainActivity: true
  images:
    - "/images/past-activities/quantum-workshop-2025.jpg"
  link:
    url: "https://example.com/quantum-workshop"
    text: "Workshop Details"
```

## Properties Reference

| Property        | Type      | Description                                      |
|-----------------|-----------|--------------------------------------------------|
| icon            | string    | Emoji or icon for the activity                   |
| header          | string    | Title of the activity                            |
| badge           | string    | Year or label                                    |
| description     | string    | Brief description                                |
| isMainActivity  | boolean   | `true` for main activities, `false` otherwise    |
| images          | list      | (optional) List of image paths                   |
| link            | object    | (optional) External link with `url` and `text`   |

For more details, see existing entries in `content/activities/data/index.en.yaml`.

## Configuration

The display and behavior of activities are managed by Hugo and the Blowfish theme. You can configure listing, sorting, and appearance in `config/_default/config.toml` and `config/_default/params.toml`.

For more details, see the [Blowfish documentation](https://blowfish.page/docs/).
